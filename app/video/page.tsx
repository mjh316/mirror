"use client";

import { useState, useRef } from "react";

export default function VideoPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const videoURL = URL.createObjectURL(blob);
        setRecordedVideo(videoURL);
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoURL = URL.createObjectURL(file);
      setUploadedVideo(videoURL);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const extractAudioFromVideo = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const videoFileAsBuffer = reader.result as ArrayBuffer;

          // Create audio context
          const audioContext = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext)();

          // Decode the video file as audio data
          const decodedAudioData =
            await audioContext.decodeAudioData(videoFileAsBuffer);

          // Get audio properties
          const numberOfChannels = decodedAudioData.numberOfChannels;
          const sampleRate = decodedAudioData.sampleRate;
          const duration = decodedAudioData.duration;

          // Create offline audio context for rendering with optimized sample rate
          const optimizedSampleRate = Math.min(sampleRate, 16000); // Limit to 16kHz for smaller files
          const offlineAudioContext = new OfflineAudioContext(
            numberOfChannels,
            optimizedSampleRate * duration,
            optimizedSampleRate
          );

          // Create buffer source
          const soundSource = offlineAudioContext.createBufferSource();
          soundSource.buffer = decodedAudioData;
          soundSource.connect(offlineAudioContext.destination);
          soundSource.start();

          // Render the audio
          const renderedBuffer = await offlineAudioContext.startRendering();

          // Convert AudioBuffer to Blob
          const audioData = new Float32Array(
            renderedBuffer.length * numberOfChannels
          );
          let offset = 0;

          for (let channel = 0; channel < numberOfChannels; channel++) {
            audioData.set(renderedBuffer.getChannelData(channel), offset);
            offset += renderedBuffer.length;
          }

          // Convert to 16-bit PCM
          const pcmData = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            pcmData[i] = Math.max(
              -32768,
              Math.min(32767, audioData[i] * 32768)
            );
          }

          // Create WAV file with optimized sample rate
          const wavBlob = createWavBlob(
            pcmData,
            optimizedSampleRate,
            numberOfChannels
          );
          resolve(wavBlob);
        } catch (error) {
          console.error("Audio extraction error:", error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read video file"));
      reader.readAsArrayBuffer(videoBlob);
    });
  };

  const createWavBlob = (
    pcmData: Int16Array,
    sampleRate: number,
    channels: number
  ): Blob => {
    const length = pcmData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Write PCM data
    for (let i = 0; i < length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const transcribeVideo = async () => {
    if (!recordedVideo && !uploadedVideo) {
      setTranscriptionError("No video available to transcribe");
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      // Get the video blob
      let videoBlob: Blob;

      if (recordedVideo) {
        // For recorded video, we already have the blob
        const response = await fetch(recordedVideo);
        videoBlob = await response.blob();
      } else if (uploadedVideo) {
        // For uploaded video, we need to get the file
        const response = await fetch(uploadedVideo);
        videoBlob = await response.blob();
      } else {
        throw new Error("No video available");
      }

      console.log("Extracting audio from video...");
      // Extract audio from video using Web Audio API
      const audioBlob = await extractAudioFromVideo(videoBlob);
      console.log("Audio extracted, size:", audioBlob.size, "bytes");

      // Create FormData for the API
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");

      // Send to our transcription API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      setTranscription(data.text);
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscriptionError(
        error instanceof Error ? error.message : "Transcription failed"
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const resetVideo = () => {
    setRecordedVideo(null);
    setUploadedVideo(null);
    setTranscription(null);
    setTranscriptionError(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Video Upload & Recording
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Upload a video file or record yourself talking
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Video Display Area */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-6">
              {recordedVideo || uploadedVideo ? (
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={recordedVideo || uploadedVideo || undefined}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No video selected
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Camera Preview */}
            {isRecording && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Live Preview
                </h3>
                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Recording Timer */}
            {isRecording && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-red-700 dark:text-red-300 font-mono text-lg">
                    Recording: {formatTime(recordingTime)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Upload Video
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Choose a video file from your device
              </p>

              <div className="space-y-4">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      MP4, MOV, AVI, etc.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Recording Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Record Video
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Record yourself using your camera
              </p>

              <div className="space-y-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-full flex items-center justify-center px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full flex items-center justify-center px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Stop Recording
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Transcription Section */}
          {(recordedVideo || uploadedVideo) && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Transcription
              </h2>

              <div className="space-y-4">
                <button
                  onClick={transcribeVideo}
                  disabled={isTranscribing}
                  className="w-full flex items-center justify-center px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
                >
                  {isTranscribing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Transcribe Speech
                    </>
                  )}
                </button>

                {transcriptionError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl">
                    <p className="text-red-700 dark:text-red-300">
                      {transcriptionError}
                    </p>
                  </div>
                )}

                {transcription && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Transcription Result:
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                        {transcription}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(transcription)
                        }
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Copy Text
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([transcription], {
                            type: "text/plain",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "transcription.txt";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reset Button */}
          {(recordedVideo || uploadedVideo) && (
            <div className="text-center mt-8">
              <button
                onClick={resetVideo}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors"
              >
                Reset Video
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="text-center mt-8">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
