import { NextRequest, NextResponse } from "next/server";
import { bufferToImageDataUrl } from "@/lib/image-data";
import { generateSceneVariation, makeSceneVariationFileName } from "@/lib/scene-generation";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sceneAssetId?: string;
      sceneDataUrl?: string;
      sceneFileName?: string | null;
      sceneName?: string;
      extraPrompt?: string;
    };

    const result = await generateSceneVariation(body);
    const createdAt = new Date().toISOString();
    return NextResponse.json({
      image: {
        id: `scene-variation-${Date.now()}`,
        data_url: bufferToImageDataUrl(result.buffer),
        file_name: makeSceneVariationFileName(body.sceneName || body.sceneFileName || "Scene"),
        prompt: result.prompt,
        created_at: createdAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成相似場景失敗。" },
      { status: 500 }
    );
  }
}
