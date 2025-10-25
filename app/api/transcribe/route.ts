import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
console.log('Raw API key from env:', apiKey);

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function POST(request: NextRequest) {
  console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
  console.log('API Key starts with:', process.env.OPENAI_API_KEY);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Audio file received:', file.name, file.type, file.size);

    // Convert File to OpenAI format
    const buffer = await file.arrayBuffer();
    const audioFile = new File([buffer], file.name, { type: file.type });

    console.log('Sending to OpenAI...');

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
      prompt: "This is a natural conversation. Please transcribe exactly as spoken, including all filler words like 'um', 'uh', 'like', 'you know', pauses, repetitions, and natural speech patterns. Do not clean up or edit the speech. Keep it authentic to how the person actually talks.",
    });

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments,
      words: transcription.words,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
