import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const apiKey = process.env.OPENAI_API_KEY;
console.log('Raw API key from env:', apiKey);

const openai = new OpenAI({
  apiKey: apiKey,
});

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
  console.log('API Key starts with:', process.env.OPENAI_API_KEY);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const questionId = formData.get('questionId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    console.log('Audio file received:', file.name, file.type, file.size);

    // Convert File to OpenAI format
    const buffer = await file.arrayBuffer();
    const audioFile = new File([buffer], file.name, { type: file.type });

    // Upload file to Convex storage
    console.log('Uploading file to Convex...');
    const uploadUrl = await convex.mutation(api.fileOperations.generateUploadUrl);
    
    // Upload the file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to Convex');
    }

    const { storageId } = await uploadResponse.json();
    console.log('File uploaded to Convex with storage ID:', storageId);

    // Store audio file metadata
    await convex.mutation(api.fileOperations.storeFileMetadata, {
      fileName: file.name,
      userId: userId,
      storageId: storageId,
      questionId: questionId || undefined,
      fileType: "audio",
    });

    console.log('Sending to OpenAI for transcription...');

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
      prompt: "This is a natural conversation. Please transcribe exactly as spoken, including all filler words like 'um', 'uh', 'like', 'you know', pauses, repetitions, and natural speech patterns. Do not clean up or edit the speech. Keep it authentic to how the person actually talks.",
    });

    // Upload transcription as .txt file to Convex
    console.log('Uploading transcription text to Convex...');
    const transcriptionText = transcription.text;
    const transcriptionBlob = new Blob([transcriptionText], { type: 'text/plain' });
    const transcriptionArrayBuffer = await transcriptionBlob.arrayBuffer();

    const transcriptionUploadUrl = await convex.mutation(api.fileOperations.generateUploadUrl);
    
    const transcriptionUploadResponse = await fetch(transcriptionUploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: transcriptionArrayBuffer,
    });

    if (!transcriptionUploadResponse.ok) {
      throw new Error('Failed to upload transcription file to Convex');
    }

    const { storageId: transcriptionStorageId } = await transcriptionUploadResponse.json();
    console.log('Transcription uploaded to Convex with storage ID:', transcriptionStorageId);

    // Store transcription file metadata
    await convex.mutation(api.fileOperations.storeFileMetadata, {
      fileName: 'transcription.txt',
      userId: userId,
      storageId: transcriptionStorageId,
      questionId: questionId || undefined,
      fileType: "transcription",
    });

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments,
      words: transcription.words,
      storageId: storageId,
      transcriptionStorageId: transcriptionStorageId,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
