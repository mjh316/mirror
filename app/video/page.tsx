"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export default function VideoPage() {
  const { user } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingVideo, setCurrentRecordingVideo] = useState<number | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [selectedQuestion2, setSelectedQuestion2] = useState<string>("");
  const [firstVideoSubmitted, setFirstVideoSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuestion1Change = (value: string) => {
    if (value && value === selectedQuestion2) {
      alert('This question is already selected for Question 2. Please choose a different question.');
      return;
    }
    setSelectedQuestion(value);
  };

  const handleQuestion2Change = (value: string) => {
    if (value && value === selectedQuestion) {
      alert('This question is already selected for Question 1. Please choose a different question.');
      return;
    }
    setSelectedQuestion2(value);
  };
  const [uploadedVideo2, setUploadedVideo2] = useState<string | null>(null);
  const [recordedVideo2, setRecordedVideo2] = useState<string | null>(null);
  const [transcription2, setTranscription2] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (isSecondVideo: boolean = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true,
      });

      console.log('Got stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());

      // Set recording state first
      setIsRecording(true);
      setCurrentRecordingVideo(isSecondVideo ? 2 : 1);
      setRecordingTime(0);

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
        // Set to appropriate video state
        if (isSecondVideo) {
          setRecordedVideo2(videoURL);
        } else {
          setRecordedVideo(videoURL);
        }
        setIsRecording(false);
        setCurrentRecordingVideo(null);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start();

      // Set the stream to the appropriate video element after a small delay
      // to ensure the video element is rendered
      setTimeout(() => {
        if (isSecondVideo) {
          if (videoRef2.current) {
            videoRef2.current.srcObject = stream;
            console.log('Stream assigned to videoRef2');
          } else {
            console.log('videoRef2.current is null');
          }
        } else {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log('Stream assigned to videoRef');
          } else {
            console.log('videoRef.current is null');
          }
        }
      }, 100);

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
      // Stop the stream from both possible video elements
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      if (videoRef2.current && videoRef2.current.srcObject) {
        const stream = videoRef2.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef2.current.srcObject = null;
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

  const transcribeVideo = async (isSecondVideo = false): Promise<string> => {
    const videoUrl = isSecondVideo ? (recordedVideo2 || uploadedVideo2) : (recordedVideo || uploadedVideo);
    
    if (!videoUrl) {
      if (!isSecondVideo) {
        setTranscriptionError("No video available to transcribe");
      }
      return '';
    }

    if (!user) {
      if (!isSecondVideo) {
        setTranscriptionError("User not authenticated");
      }
      return '';
    }

    if (!isSecondVideo) {
      setIsTranscribing(true);
      setTranscriptionError(null);
    }

    try {
      // Get the video blob
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      console.log(`Extracting audio from video ${isSecondVideo ? '2' : '1'}...`);
      // Extract audio from video using Web Audio API
      const audioBlob = await extractAudioFromVideo(videoBlob);
      console.log("Audio extracted, size:", audioBlob.size, "bytes");

      // Create FormData for the API
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("userId", user.id);
      formData.append("questionId", isSecondVideo ? selectedQuestion2 : selectedQuestion);

      // Send to our transcription API
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await transcribeResponse.json();
      
      // Set the appropriate state based on which video
      if (isSecondVideo) {
        setTranscription2(data.text);
      } else {
        setTranscription(data.text);
        // Mark first video as submitted if it's the first one
        if (!firstVideoSubmitted) {
          setFirstVideoSubmitted(true);
        }
      }
      
      return data.text;
    } catch (error) {
      console.error("Transcription error:", error);
      if (!isSecondVideo) {
        setTranscriptionError(
          error instanceof Error ? error.message : "Transcription failed"
        );
      }
      return '';
    } finally {
      if (!isSecondVideo) {
        setIsTranscribing(false);
      }
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

  // Show buffering page when submitting
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <img 
              src="/buffering.png" 
              alt="Buffering" 
              className="mx-auto"
              style={{ width: '400px', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Let's Mirrorfy!
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Please record/upload ~20 second responses to 2 out of the 5 questions below!<br />
            Don't overthink it - just say what comes to mind. Be yourself, speak the way you'd talk to a friend, and have fun with it! <br />
            Your natural reactions, tone, and little pauses are what make your answer you.
          </p>
        </div>

        {/* Questions */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              1. You open your phone and see a free plane ticket anywhere! Where are you going first?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Examples: Italy for pasta-making lessons, Seoul for late night karaoke and street food, or Iceland just to chase the Northern Lights
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              2. What snack is your go-to when you're having a bad day and why?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Examples: the local cafe's iced latte, your mom's chocolate chip cookies, extra toasty cheez-its
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              3. If you could instantly master one random skill, what would it be?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Examples: the perfect comedic timing to make anyone laugh, animal-whisperer, or speed-reading
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-4 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              4. What is your biggest hot take?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Examples: "brunch is just overpriced breakfast, no one actually enjoys camping, cold pizza is better than hot pizza"
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              5. If your phone could talk, what would it roast you for the most?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Example: pretending to "check the time" mid-conversation, 200 unread texts, midnight search history rabbit holes
            </p>
          </div>
        </div>

        {/* Question Selection Dropdown */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Question 1: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedQuestion}
              onChange={(e) => handleQuestion1Change(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Select a question...</option>
              <option value="question1" disabled={selectedQuestion2 === "question1"}>1. You open your phone and see a free plane ticket anywhere! Where are you going first?</option>
              <option value="question2" disabled={selectedQuestion2 === "question2"}>2. What snack is your go-to when you're having a bad day and why?</option>
              <option value="question3" disabled={selectedQuestion2 === "question3"}>3. If you could instantly master one random skill, what would it be?</option>
              <option value="question4" disabled={selectedQuestion2 === "question4"}>4. What is your biggest hot take?</option>
              <option value="question5" disabled={selectedQuestion2 === "question5"}>5. If your phone could talk, what would it roast you for the most?</option>
            </select>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Video Display Area */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <div className="max-w-md mx-auto aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-6">
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
            {isRecording && currentRecordingVideo === 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Live Preview
                </h3>
                <div className="max-w-md mx-auto aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Recording Timer */}
            {isRecording && currentRecordingVideo === 1 && (
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
                    onClick={() => startRecording(false)}
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

          {/* Question 2 Selection */}
          <div className="max-w-4xl mx-auto mb-8 mt-16">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Question 2: <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedQuestion2}
                onChange={(e) => handleQuestion2Change(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">Select a question...</option>
                <option value="question1" disabled={selectedQuestion === "question1"}>1. You open your phone and see a free plane ticket anywhere! Where are you going first?</option>
                <option value="question2" disabled={selectedQuestion === "question2"}>2. What snack is your go-to when you're having a bad day and why?</option>
                <option value="question3" disabled={selectedQuestion === "question3"}>3. If you could instantly master one random skill, what would it be?</option>
                <option value="question4" disabled={selectedQuestion === "question4"}>4. What is your biggest hot take?</option>
                <option value="question5" disabled={selectedQuestion === "question5"}>5. If your phone could talk, what would it roast you for the most?</option>
              </select>
            </div>
          </div>

          {/* Second Video Display and Upload/Record Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
              <div className="max-w-md mx-auto aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-6">
                {recordedVideo2 || uploadedVideo2 ? (
                      <video
                        controls
                        className="w-full h-full object-cover"
                        src={recordedVideo2 || uploadedVideo2 || undefined}
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
            </div>

            {/* Live Camera Preview for Second Video */}
            {isRecording && currentRecordingVideo === 2 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Live Preview
                </h3>
                <div className="max-w-md mx-auto aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  <video
                    ref={videoRef2}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Recording Timer */}
            {isRecording && currentRecordingVideo === 2 && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-red-700 dark:text-red-300 font-mono text-lg">
                    Recording: {formatTime(recordingTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Upload and Record Controls */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const videoURL = URL.createObjectURL(file);
                          setUploadedVideo2(videoURL);
                        }
                      }}
                      className="hidden"
                      id="video-upload-2"
                    />
                    <label
                      htmlFor="video-upload-2"
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
                        onClick={() => startRecording(true)}
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
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-8">
            <button
              onClick={async () => {
                // Validate that both questions are selected and different
                if (!selectedQuestion || !selectedQuestion2) {
                  alert('Please select both questions');
                  return;
                }
                if (selectedQuestion === selectedQuestion2) {
                  alert('Please select two different questions');
                  return;
                }

                // Show buffering page
                setIsSubmitting(true);

                let t1 = transcription || '';
                let t2 = transcription2 || '';
                
                // Transcribe first video if needed
                if (!transcription && (recordedVideo || uploadedVideo)) {
                  t1 = await transcribeVideo(false);
                }
                
                // Transcribe second video if needed  
                if (!transcription2 && (recordedVideo2 || uploadedVideo2)) {
                  t2 = await transcribeVideo(true);
                }
                
                // Navigate with the transcription text we got back
                window.location.href = `/results?transcription1=${encodeURIComponent(t1)}&transcription2=${encodeURIComponent(t2)}`;
              }}
              disabled={!(recordedVideo || uploadedVideo) || !selectedQuestion || !selectedQuestion2 || selectedQuestion === selectedQuestion2}
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
            >
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Submit
            </button>
          </div>
      </div>
    </div>
  );
}
