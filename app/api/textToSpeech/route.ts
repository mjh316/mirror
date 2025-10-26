import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, userId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Get Fish API token from environment
    const fishApiToken = process.env.FISH_API_KEY;
    if (!fishApiToken) {
      return NextResponse.json(
        { error: "Fish API token not configured" },
        { status: 500 }
      );
    }

    // If userId is provided, try to get their custom model
    const modelToUse = "s1"; // Default model
    let reference_id: string | null = null;

    if (userId) {
      try {
        const ConvexHttpClient = (await import("convex/browser"))
          .ConvexHttpClient;
        const convex = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        const { api } = await import("@/convex/_generated/api");

        // Get user's Fish models from Convex
        const fishModels = await convex.query(
          api.fileOperations.getFishModelsByUser,
          {
            userId,
          }
        );

        // Use the most recent trained model if available
        if (fishModels && fishModels.length > 0) {
          // Sort by createdAt descending (newest first)
          const sortedModels = [...fishModels].sort(
            (a, b) => b.createdAt - a.createdAt
          );

          // Find the first (newest) trained model
          const trainedModel = sortedModels.find(
            (model) => model.state === "trained"
          );

          if (trainedModel) {
            reference_id = trainedModel.fishModelId;
            console.log("Using user's newest custom model:", reference_id);
          } else {
            console.log(
              "No trained models found for user, using default voice"
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user's model:", error);
        // Continue with default model
      }
    }

    // Prepare request body for Fish Audio TTS API
    const requestBody: {
      text: string;
      temperature: number;
      top_p: number;
      format: string;
      latency: string;
      normalize: boolean;
      reference_id?: string;
    } = {
      text,
      temperature: 0.9,
      top_p: 0.9,
      format: "mp3",
      latency: "normal",
      normalize: true,
    };

    // Add reference_id if we have a custom model
    if (reference_id) {
      requestBody.reference_id = reference_id;
    }

    // Call Fish Audio TTS API
    const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fishApiToken}`,
        "Content-Type": "application/json",
        model: modelToUse,
      },
      body: JSON.stringify(requestBody),
    });

    if (!fishResponse.ok) {
      const errorText = await fishResponse.text();
      console.error("Fish API TTS error:", errorText);
      return NextResponse.json(
        { error: `Fish API error: ${fishResponse.status}` },
        { status: fishResponse.status }
      );
    }

    // Get the audio blob
    const audioBlob = await fishResponse.blob();

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      audio: `data:audio/mp3;base64,${base64Audio}`,
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
