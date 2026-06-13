import { getOpenAIKey } from "./app-settings";
import { downloadDriveFile } from "./google-drive";
import { imageDataUrlToBuffer } from "./image-data";
import { OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY, OPENAI_IMAGE_SIZE, parseOpenAIError } from "./openai";
import { DriveAsset } from "./types";

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export type SceneReferenceInput = {
  sceneAssetId?: string;
  sceneDataUrl?: string;
  sceneFileName?: string | null;
  sceneName?: string | null;
  extraPrompt?: string | null;
};

export async function generateSceneVariation(input: SceneReferenceInput) {
  if (!input.sceneAssetId && !input.sceneDataUrl) throw new Error("請先選擇一張場景圖。");

  const apiKey = await getOpenAIKey();
  if (!apiKey) throw new Error("未設定 OpenAI API key，請先到設定頁輸入。");

  const reference = await getSceneReference(input);
  if (reference.buffer.length > MAX_REFERENCE_BYTES) throw new Error("場景圖超過 50MB，請先壓縮後再使用。");

  const prompt = buildScenePrompt(input.sceneName || undefined, input.extraPrompt || undefined);
  const formData = new FormData();
  formData.append("model", OPENAI_IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", OPENAI_IMAGE_SIZE);
  formData.append("quality", OPENAI_IMAGE_QUALITY);
  formData.append("output_format", "png");
  formData.append("image[]", new Blob([reference.buffer], { type: reference.mimeType }), reference.fileName);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });

  if (!response.ok) throw new Error(await parseOpenAIError(response));

  const json = (await response.json()) as OpenAIImageResponse;
  return {
    buffer: await extractImageBuffer(json),
    prompt
  };
}

export function buildScenePrompt(sceneName?: string, extraPrompt?: string) {
  const lines = [
    "Use the uploaded image as a real-world scene seed.",
    "Create a new realistic background scene that feels like the same location category, but is not a copy of the original photo.",
    "Keep the geography, lighting logic, lens style, street texture, weather mood, camera height and perspective physically plausible.",
    "Change the exact viewpoint, framing, foreground objects and small environmental details so it becomes a fresh reusable scene.",
    "Do not include any people, faces, readable text, fake signs, logos, watermarks, duplicated subjects, impossible architecture or fantasy elements.",
    "Make it look like a real empty photo background suitable for later adding one fictional adult fashion model.",
    "Ultra realistic photography, natural lighting, real camera look, high detail, non-cartoon, non-anime."
  ];
  if (sceneName) lines.push(`Reference scene label: ${sceneName}.`);
  if (extraPrompt?.trim()) lines.push(`Extra direction: ${extraPrompt.trim()}`);
  return lines.join("\n");
}

export function makeSceneVariationFileName(scene?: DriveAsset | string | null) {
  const label = typeof scene === "string" ? scene : scene?.sub_category || scene?.file_name || "Scene";
  const clean = label.replace(/[^a-z0-9]+/gi, "").slice(0, 48) || "Scene";
  const createdAt = new Date();
  const date = createdAt.toISOString().slice(0, 10);
  const time = createdAt.toTimeString().slice(0, 5).replace(":", "");
  return `${date}_${time}_${clean}_AI_Scene.png`;
}

async function getSceneReference(input: SceneReferenceInput) {
  if (input.sceneDataUrl) {
    const localImage = imageDataUrlToBuffer(input.sceneDataUrl);
    return {
      buffer: localImage.buffer,
      mimeType: localImage.mimeType,
      fileName: input.sceneFileName || "local-scene-reference.png"
    };
  }
  const buffer = await downloadDriveFile(input.sceneAssetId || "");
  return {
    buffer,
    mimeType: "image/png",
    fileName: "drive-scene-reference.png"
  };
}

async function extractImageBuffer(json: OpenAIImageResponse) {
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  const url = json.data?.[0]?.url;
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error(`OpenAI image URL 下載失敗：HTTP ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI 回應沒有包含圖片。");
}
