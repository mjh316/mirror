"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [transcription1, setTranscription1] = useState<string>("");
  const [transcription2, setTranscription2] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userTranscriptions, setUserTranscriptions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesLength = useRef(0);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // Fetch user's transcription files from Convex
  const userFiles = useQuery(
    api.fileOperations.getFilesByUserAndType,
    user ? { userId: user.id, fileType: "transcription" } : "skip"
  );

  // Fetch transcription content from storage
  useEffect(() => {
    const fetchTranscriptionContent = async (storageId: string) => {
      try {
        // Get the storage URL
        const response = await fetch(`/api/getFile?storageId=${storageId}`);
        const data = await response.json();
        const url = data.url;

        if (url) {
          const fileResponse = await fetch(url);
          const text = await fileResponse.text();
          return text;
        }
      } catch (error) {
        console.error("Error fetching transcription content:", error);
      }
      return "";
    };

    const loadTranscriptions = async () => {
      if (userFiles && userFiles.length > 0) {
        const contents = await Promise.all(
          userFiles.map((file) => fetchTranscriptionContent(file.storageId))
        );
        setUserTranscriptions(contents.filter(Boolean));
      }
    };

    if (userFiles) {
      loadTranscriptions();
    }
  }, [userFiles]);

  useEffect(() => {
    const t1 = searchParams.get("transcription1");
    const t2 = searchParams.get("transcription2");

    if (t1) setTranscription1(decodeURIComponent(t1));
    if (t2) setTranscription2(decodeURIComponent(t2));
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play audio for new assistant messages
  useEffect(() => {
    const handleNewAssistantMessage = async () => {
      // Check if there are new messages
      if (messages.length > previousMessagesLength.current) {
        // Get the newest message
        const newMessages = messages.slice(previousMessagesLength.current);
        const latestMessage = newMessages[newMessages.length - 1];

        // Only play audio if the newest message is from the assistant
        if (latestMessage?.role === "assistant" && latestMessage.content) {
          // Stop any currently playing audio
          if (currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
          }

          try {
            console.log("Generating audio for assistant message...");
            const response = await fetch("/api/textToSpeech", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: latestMessage.content,
                userId: user?.id,
              }),
            });

            if (!response.ok) {
              console.error("Failed to generate audio");
              return;
            }

            const data = await response.json();

            // Play the audio
            const audio = new Audio(data.audio);
            currentAudio.current = audio;

            audio.onended = () => {
              currentAudio.current = null;
            };

            audio.onerror = (error) => {
              console.error("Audio playback error:", error);
              currentAudio.current = null;
            };

            await audio.play();
            console.log("Audio playing...");
          } catch (error) {
            console.error("Error playing audio:", error);
          }
        }
      }

      previousMessagesLength.current = messages.length;
    };

    handleNewAssistantMessage();
  }, [messages, user?.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
    };
  }, []);

  // Initialize chat with greeting if we have transcriptions from Convex
  useEffect(() => {
    if (userTranscriptions.length > 0 && messages.length === 0) {
      // Use a more natural greeting that sounds like they're talking to themselves
      setMessages([
        {
          role: "assistant",
          content:
            "Hey, I've been listening to your thoughts... What do you want to explore?",
        },
      ]);
    }
  }, [userTranscriptions, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context with user's transcriptions from Convex
      // Create a new array with all messages including the new user message
      const allMessages: Message[] = [];

      // Add transcription context as system message if we have transcriptions
      if (userTranscriptions.length > 0) {
        const transcriptionContext = userTranscriptions
          .map((trans, idx) => `Previous response ${idx + 1}:\n${trans}`)
          .join("\n\n");

        allMessages.push({
          role: "system",
          content: `You are the user's inner voice and reflection assistant. Below are the user's own words from their previous recordings:

${transcriptionContext}

YOUR TASK: Analyze the user's speech patterns carefully - notice their vocabulary, sentence structure, word choices, tone, level of formality, use of filler words, and overall speaking style. Then imitate this exact manner of speaking when responding. 

Respond as if you ARE the user talking to themselves in their head - using their exact speaking style, word choices, and tone. Reflect their thoughts back to them in their own voice. Be insightful and help them understand themselves better while maintaining their authentic speaking patterns and continuing the conversation.`,
        });
      }

      // Add all previous conversation messages (including both user and assistant messages)
      // This ensures the chatbot has full context of the entire conversation
      allMessages.push(...messages);

      // Add the current user message
      allMessages.push(userMessage);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Chat with Mirror
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Explore your thoughts and reflections
              </p>
            </div>
            <button
              onClick={() => router.push("/video")}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors"
            >
              New Recording
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-6 py-4 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading chat...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
