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

    // Add system message at the beginning if it's not already there
    const allMessages = [...messages];
    if (!messages.some((m: any) => m.role === 'system')) {
      allMessages.unshift({
        role: 'system',
        content: 'You are Mirror, a thoughtful AI assistant that helps people explore their thoughts and reflections. You engage in meaningful conversations, ask insightful questions, and help users deepen their self-understanding. Be warm, conversational, and genuinely curious about what the user is sharing.'
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      temperature: 0.7,
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

