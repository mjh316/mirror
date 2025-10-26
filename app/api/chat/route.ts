import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Convert messages to AI SDK format
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      messages,
      temperature: 0.8,
      maxRetries: 3,
    });

    return NextResponse.json({
      message: text,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get chat response" },
      { status: 500 }
    );
  }
}
