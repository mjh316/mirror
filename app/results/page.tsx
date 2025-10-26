'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transcription1, setTranscription1] = useState<string>('');
  const [transcription2, setTranscription2] = useState<string>('');

  useEffect(() => {
    const t1 = searchParams.get('transcription1');
    const t2 = searchParams.get('transcription2');
    
    if (t1) setTranscription1(decodeURIComponent(t1));
    if (t2) setTranscription2(decodeURIComponent(t2));
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Your Responses
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Review your transcriptions below
            </p>
          </div>

          {/* First Transcription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Question 1 Response
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {transcription1 || 'No transcription available'}
              </p>
            </div>
            {transcription1 && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(transcription1)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([transcription1], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'question1-transcription.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Second Transcription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Question 2 Response
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {transcription2 || 'No transcription available'}
              </p>
            </div>
            {transcription2 && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(transcription2)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([transcription2], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'question2-transcription.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="text-center">
            <button
              onClick={() => router.push('/video')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Record More Videos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
