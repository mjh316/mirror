import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Use the messages as-is (system message should already be included if needed)
    const allMessages = messages;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      temperature: 0.8,
      max_tokens: 1024,
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content || '',
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat response' },
      { status: 500 }
    );
  }
}

