"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";

interface VideoRecorderProps {
  index: 1 | 2;
  video: string | null;
  transcription: string;
  onVideoChange: (video: string | null) => void;
  onTranscriptionChange: (transcription: string) => void;
}

export default function VideoRecorder({
  index,
  video,
  transcription,
  onVideoChange,
  onTranscriptionChange,
}: VideoRecorderProps) {
  const { user } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

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
        onVideoChange(videoURL);
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
      onVideoChange(videoURL);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTranscribe = async () => {
    if (!video || !user) return;

    setIsTranscribing(true);

    try {
      const response = await fetch(video);
      const videoBlob = await response.blob();

      const formData = new FormData();
      formData.append("file", videoBlob, "video.webm");
      formData.append("userId", user.id);

      alert("formData: " + JSON.stringify(formData));

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed");
      }

      const data = await transcribeResponse.json();
      onTranscriptionChange(data.text);
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Video {index}
      </h2>

      {/* Video Display */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-4">
        {video ? (
          <video
            ref={videoRef}
            controls={!isRecording}
            autoPlay={isRecording}
            muted={isRecording}
            className="w-full h-full object-cover"
            src={video}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-400"
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No video
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recording Timer */}
      {isRecording && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900 rounded-full">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-red-700 dark:text-red-300 font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        </div>
      )}

      {/* Transcription Status */}
      {transcription && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            ✓ Transcribed
          </p>
        </div>
      )}

      {isTranscribing && (
        <div className="mb-4 flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Transcribing...
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
          id={`upload-video-${index}`}
        />
        <label
          htmlFor={`upload-video-${index}`}
          className="block w-full px-4 py-3 text-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
        >
          <span className="text-gray-900 dark:text-white font-medium">
            Upload Video
          </span>
        </label>

        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Stop Recording
          </button>
        )}

        {video && !transcription && (
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isTranscribing ? "Transcribing..." : "Transcribe"}
          </button>
        )}
      </div>
    </div>
  );
}
