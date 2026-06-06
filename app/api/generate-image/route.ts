import { NextRequest, NextResponse } from "next/server";
import { formatAppSettingsError, getOpenAIKey } from "@/lib/app-settings";
import { downloadDriveFile, makeGeneratedFileName, uploadGeneratedImage } from "@/lib/google-drive";
import {
  OPENAI_IMAGE_MODEL,
  OPENAI_IMAGE_QUALITY,
  OPENAI_IMAGE_SIZE,
  parseOpenAIError
} from "@/lib/openai";
import { buildPrompt, getNegativePrompt } from "@/lib/prompt";
import { DriveAsset, GeneratePayload } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as GeneratePayload;
    validatePayload(payload);

    const supabase = getSupabaseAdmin();
    const sceneAsset = await resolveAsset(supabase, payload.sceneAssetId, "scene");
    if (!sceneAsset) throw new Error("找不到已選場景素材，請重新同步 Google Drive 素材。");

    const optionalAssets = (
      await Promise.all([
        payload.girlReferenceAssetId ? resolveAsset(supabase, payload.girlReferenceAssetId, "girl") : null,
        payload.outfitAssetId ? resolveAsset(supabase, payload.outfitAssetId, "outfit") : null,
        payload.hairAssetId ? resolveAsset(supabase, payload.hairAssetId, "hair") : null,
        payload.poseAssetId ? resolveAsset(supabase, payload.poseAssetId, "pose") : null
      ])
    ).filter(Boolean) as DriveAsset[];

    const references = [sceneAsset, ...optionalAssets];
    const prompt = buildPrompt(payload, { scene: sceneAsset, extras: optionalAssets });
    const negativePrompt = getNegativePrompt();
    const images = [];
    const warnings = new Set<string>();

    for (let index = 0; index < payload.count; index += 1) {
      const imageBuffer = await generateImageWithOpenAI(prompt, references);
      const fileName = makeGeneratedFileName({
        scene: sceneAsset.sub_category || sceneAsset.file_name,
        girlStyle: payload.girlStyle,
        hairStyle: payload.hairStyle,
        outfit: payload.outfit
      });

      const baseRecord = {
        prompt,
        negative_prompt: negativePrompt,
        scene_asset_id: payload.sceneAssetId,
        girl_reference_asset_id: payload.girlReferenceAssetId || null,
        outfit_asset_id: payload.outfitAssetId || null,
        hair_asset_id: payload.hairAssetId || null,
        pose_asset_id: payload.poseAssetId || null,
        girl_style: payload.girlStyle,
        hairstyle: payload.hairStyle,
        hair_color: payload.hairColor,
        outfit: payload.outfit,
        expression: payload.expression,
        body_type: payload.bodyType,
        pose: payload.pose
      };

      let uploadWarning = "";
      let uploaded:
        | {
            google_drive_file_id: string;
            google_drive_url: string | null;
            thumbnail_url: string | null;
          }
        | null = null;

      try {
        uploaded = await uploadGeneratedImage(imageBuffer, fileName);
      } catch (error) {
        uploadWarning = explainDriveUploadError(error);
        warnings.add(uploadWarning);
      }

      const fallbackId = `local-${Date.now()}-${index}`;
      const record = {
        id: uploaded?.google_drive_file_id || fallbackId,
        google_drive_file_id: uploaded?.google_drive_file_id || null,
        google_drive_url: uploaded?.google_drive_url || null,
        thumbnail_url: uploaded?.thumbnail_url || null,
        data_url: uploaded ? null : `data:image/png;base64,${imageBuffer.toString("base64")}`,
        file_name: fileName,
        upload_warning: uploadWarning || null,
        ...baseRecord,
        created_at: new Date().toISOString()
      };

      if (uploaded) {
        try {
          const { data, error } = await supabase
            .from("generated_images")
            .insert({
              google_drive_file_id: uploaded.google_drive_file_id,
              google_drive_url: uploaded.google_drive_url,
              thumbnail_url: uploaded.thumbnail_url,
              ...baseRecord
            })
            .select("*")
            .single();
          if (!error && data) {
            images.push({ ...data, file_name: fileName, upload_warning: null });
            continue;
          }
          if (error) warnings.add(formatAppSettingsError(error));
        } catch (error) {
          warnings.add(formatAppSettingsError(error));
        }
      }

      images.push(record);
    }

    return NextResponse.json({ images, warnings: Array.from(warnings) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失敗。" },
      { status: 500 }
    );
  }
}

async function resolveAsset(supabase: SupabaseAdmin, assetId: string, category: DriveAsset["category"]) {
  try {
    const { data, error } = await supabase
      .from("drive_assets")
      .select("*")
      .or(`id.eq.${assetId},google_drive_file_id.eq.${assetId}`)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as DriveAsset;
  } catch {
    // Supabase may be paused; fall back to using the Google Drive file id from the client.
  }

  return {
    id: assetId,
    google_drive_file_id: assetId,
    google_drive_url: `https://drive.google.com/file/d/${assetId}/view`,
    thumbnail_url: null,
    file_name: `${category}-${assetId}.png`,
    mime_type: "image/png",
    category,
    sub_category: null,
    tags: [String(category)]
  } satisfies DriveAsset;
}

function validatePayload(payload: GeneratePayload) {
  if (!payload.sceneAssetId) throw new Error("請先選擇一張場景圖。");
  if (![1, 2, 4].includes(payload.count)) throw new Error("生成數量只支援 1、2 或 4。");
}

async function generateImageWithOpenAI(prompt: string, references: DriveAsset[]) {
  const apiKey = await getOpenAIKey();
  if (!apiKey) throw new Error("未設定 OpenAI API key，請先到設定頁輸入。");
  if (!references.length) throw new Error("請至少選擇一張場景圖作為 OpenAI image edit 參考。");

  const formData = new FormData();
  formData.append("model", OPENAI_IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", OPENAI_IMAGE_SIZE);
  formData.append("quality", OPENAI_IMAGE_QUALITY);
  formData.append("output_format", "png");

  for (const asset of references.slice(0, 5)) {
    const buffer = await downloadDriveFile(asset.google_drive_file_id);
    if (buffer.length > MAX_REFERENCE_BYTES) {
      throw new Error(`參考圖 ${asset.file_name || asset.google_drive_file_id} 超過 50MB，請先壓縮後再用。`);
    }
    const blob = new Blob([buffer], { type: asset.mime_type || "image/png" });
    formData.append("image[]", blob, asset.file_name || `${asset.google_drive_file_id}.png`);
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });

  if (!response.ok) throw new Error(await parseOpenAIError(response));

  const json = (await response.json()) as OpenAIImageResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  const url = json.data?.[0]?.url;
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error(`OpenAI image URL 下載失敗：HTTP ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI 回應沒有包含 b64_json 或圖片 URL。");
}

function explainDriveUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("storageQuotaExceeded") || message.includes("Service Accounts do not have storage quota")) {
    return [
      "圖片已生成，但 Google Drive 上傳失敗：Service Account 沒有個人儲存空間 quota。",
      "目前已先提供本機下載。要自動上傳 Drive，請把成品資料夾放在 Google Shared Drive，或改用 Google OAuth 使用者授權。"
    ].join(" ");
  }
  return `圖片已生成，但 Google Drive 上傳失敗：${message}`;
}
