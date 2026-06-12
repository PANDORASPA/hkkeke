import { NextRequest, NextResponse } from "next/server";
import { generateImagesFromPayload } from "@/lib/server-generation";
import { GeneratePayload } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as GeneratePayload;
    const result = await generateImagesFromPayload(payload);
    return NextResponse.json({ images: result.images, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失敗。" },
      { status: 500 }
    );
  }
}
