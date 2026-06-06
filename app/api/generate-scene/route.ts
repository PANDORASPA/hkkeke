import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/app-settings";
import { downloadDriveFile } from "@/lib/google-drive";
import { bufferToImageDataUrl } from "@/lib/image-data";
import {
  OPENAI_IMAGE_MODEL,
  OPENAI_IMAGE_QUALITY,
  OPENAI_IMAGE_SIZE,
  parseOpenAIError
} from "@/lib/openai";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sceneAssetId?: string;
      sceneName?: string;
      extraPrompt?: string;
    };

    if (!body.sceneAssetId) throw new Error("請先選擇一張場景圖。");
    const apiKey = await getOpenAIKey();
    if (!apiKey) throw new Error("未設定 OpenAI API key，請先到設定頁輸入。");

    const referenceBuffer = await downloadDriveFile(body.sceneAssetId);
    const prompt = buildScenePrompt(body.sceneName, body.extraPrompt);
    const formData = new FormData();
    formData.append("model", OPENAI_IMAGE_MODEL);
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", OPENAI_IMAGE_SIZE);
    formData.append("quality", OPENAI_IMAGE_QUALITY);
    formData.append("output_format", "png");
    formData.append("image[]", new Blob([referenceBuffer], { type: "image/png" }), "scene-reference.png");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!response.ok) throw new Error(await parseOpenAIError(response));

    const json = (await response.json()) as OpenAIImageResponse;
    const b64 = json.data?.[0]?.b64_json;
    let buffer: Buffer;
    if (b64) {
      buffer = Buffer.from(b64, "base64");
    } else if (json.data?.[0]?.url) {
      const imageResponse = await fetch(json.data[0].url);
      if (!imageResponse.ok) throw new Error(`OpenAI image URL 下載失敗：HTTP ${imageResponse.status}`);
      buffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      throw new Error("OpenAI 回應沒有包含圖片。");
    }

    const fileName = `scene-variation_${Date.now()}.png`;
    return NextResponse.json({
      image: {
        id: `scene-variation-${Date.now()}`,
        data_url: bufferToImageDataUrl(buffer),
        file_name: fileName,
        prompt,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成相似場景失敗。" },
      { status: 500 }
    );
  }
}

function buildScenePrompt(sceneName?: string, extraPrompt?: string) {
  const lines = [
    "Use the uploaded image as a scene reference.",
    "Create a new realistic background scene with a similar location, mood, framing, lighting and camera style.",
    "Do not include any people, face, text, logo, watermark, unreadable signage, or duplicated subject.",
    "Make it look like a real photo background suitable for later adding one fictional adult fashion model.",
    "Keep realistic perspective, natural lighting, high detail, non-cartoon, non-anime."
  ];
  if (sceneName) lines.push(`Reference scene label: ${sceneName}.`);
  if (extraPrompt?.trim()) lines.push(`Extra direction: ${extraPrompt.trim()}`);
  return lines.join("\n");
}
