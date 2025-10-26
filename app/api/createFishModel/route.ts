import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 }
      );
    }

    // Get all audio files for the user
    const audioFiles = await convex.query(
      api.fileOperations.getFilesByUserAndType,
      {
        userId,
        fileType: "audio",
      }
    );

    if (!audioFiles || audioFiles.length === 0) {
      return NextResponse.json(
        { error: "No audio files found for user" },
        { status: 404 }
      );
    }

    console.log(`Found ${audioFiles.length} audio file(s) for user ${userId}`);

    // Get download URLs for all audio files
    const downloadUrls = await Promise.all(
      audioFiles.map(async (file) => {
        const url = await convex.query(api.fileOperations.getFileUrl, {
          storageId: file.storageId,
        });
        return { url, storageId: file.storageId, fileName: file.fileName };
      })
    );

    console.log("Downloading audio files...");
    // Download the audio files
    const audioBlobs = await Promise.all(
      downloadUrls.map(async ({ url, fileName }) => {
        const response = await fetch(url!);
        if (!response.ok) {
          throw new Error(`Failed to download audio file: ${url}`);
        }
        return await response.blob();
      })
    );

    console.log(`Downloaded ${audioBlobs.length} audio file(s)`);

    // Create FormData for Fish API
    const formData = new FormData();
    formData.append("type", "tts");
    formData.append("title", `Voice Model for ${userId}`);
    formData.append("description", "Voice model created from video recordings");
    formData.append("visibility", "private"); // Private by default
    formData.append("train_mode", "fast"); // Fast training for instant availability

    // Append all audio files
    audioBlobs.forEach((blob, index) => {
      formData.append("voices", blob, `voice-${index}.wav`);
    });

    console.log("Uploading to Fish Audio API...");

    // Get Fish API token from environment
    const fishApiToken = process.env.FISH_API_KEY;
    if (!fishApiToken) {
      return NextResponse.json(
        { error: "Fish API token not configured" },
        { status: 500 }
      );
    }

    // Create model via Fish API
    const fishResponse = await fetch("https://api.fish.audio/model", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fishApiToken}`,
      },
      body: formData,
    });

    if (!fishResponse.ok) {
      const errorText = await fishResponse.text();
      console.error("Fish API error:", errorText);
      return NextResponse.json(
        { error: `Fish API error: ${fishResponse.status}` },
        { status: fishResponse.status }
      );
    }

    const fishModel = await fishResponse.json();
    console.log("Fish model created:", fishModel);

    // Generate a unique model ID for our system
    const modelId = `model_${Date.now()}_${userId}`;

    // Store Fish model information in Convex
    await convex.mutation(api.fileOperations.storeFishModel, {
      userId,
      modelId,
      fishModelId: fishModel._id,
      title: fishModel.title,
      description: fishModel.description || undefined,
      visibility: fishModel.visibility,
      trainMode: fishModel.train_mode || "fast",
      state: fishModel.state,
      audioFiles: downloadUrls.map(({ storageId }) => storageId),
    });

    return NextResponse.json({
      success: true,
      modelId,
      fishModel,
    });
  } catch (error) {
    console.error("Fish model creation error:", error);
    return NextResponse.json(
      { error: "Failed to create Fish model" },
      { status: 500 }
    );
  }
}
