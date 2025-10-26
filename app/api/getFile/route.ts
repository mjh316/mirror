import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storageId = searchParams.get('storageId');

  if (!storageId) {
    return NextResponse.json(
      { error: 'Storage ID is required' },
      { status: 400 }
    );
  }

  try {
    const url = await convex.query(api.fileOperations.getFileUrl, {
      storageId: storageId as any,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting file URL:', error);
    return NextResponse.json(
      { error: 'Failed to get file URL' },
      { status: 500 }
    );
  }
}

