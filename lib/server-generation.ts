import { formatAppSettingsError, getOpenAIKey } from "./app-settings";
import { appendGeneratedDriveLog } from "./generated-drive-log";
import { downloadDriveFile, makeGeneratedFileName, uploadGeneratedImage } from "./google-drive";
import { imageDataUrlToBuffer } from "./image-data";
import { OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY, OPENAI_IMAGE_SIZE, parseOpenAIError } from "./openai";
import { buildPrompt, getNegativePrompt } from "./prompt";
import { DriveAsset, GeneratedImage, GeneratePayload } from "./types";
import { getSupabaseAdmin } from "./supabase-admin";

const MAX_REFERENCE_BYTES = 50 * 1024 * 1024;

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export async function generateImagesFromPayload(payload: GeneratePayload) {
  validateGeneratePayload(payload);

  const supabase = getSupabaseAdmin();
  const sceneAsset = await resolveAsset(supabase, payload.sceneAssetId, "scene");
  if (!sceneAsset) throw new Error("找不到已選場景素材，請重新同步 Google Drive 素材。");

  const optionalAssets = (
    await Promise.all([
      resolveOptionalAsset(supabase, payload.girlReferenceAssetId, "girl", payload.girlReferenceDataUrl, payload.girlReferenceFileName),
      resolveOptionalAsset(supabase, payload.outfitAssetId, "outfit", payload.outfitDataUrl, payload.outfitFileName),
      resolveOptionalAsset(supabase, payload.hairAssetId, "hair", payload.hairDataUrl, payload.hairFileName),
      resolveOptionalAsset(supabase, payload.poseAssetId, "pose", payload.poseDataUrl, payload.poseFileName)
    ])
  ).filter(Boolean) as DriveAsset[];

  const references = [sceneAsset, ...optionalAssets];
  const prompt = buildPrompt(payload, { scene: sceneAsset, extras: optionalAssets });
  const negativePrompt = getNegativePrompt();
  const images: GeneratedImage[] = [];
  const warnings = new Set<string>();

  for (let index = 0; index < payload.count; index += 1) {
    const imageBuffer = await generateImageWithOpenAI(prompt, references, payload);
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
    const record: GeneratedImage = {
      id: uploaded?.google_drive_file_id || fallbackId,
      google_drive_file_id: uploaded?.google_drive_file_id || null,
      google_drive_url: uploaded?.google_drive_url || null,
      thumbnail_url: uploaded?.thumbnail_url || null,
      data_url: uploaded ? null : `data:image/png;base64,${imageBuffer.toString("base64")}`,
      file_name: fileName,
      upload_warning: uploadWarning || null,
      ...baseRecord,
      created_at: new Date().toISOString(),
      source: uploaded ? "drive" : "local"
    };

    if (uploaded) {
      await appendGeneratedLogSafely(record, warnings);
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
          images.push({ ...data, file_name: fileName, upload_warning: null, source: "supabase" } as GeneratedImage);
          continue;
        }
        if (error) warnings.add(formatAppSettingsError(error));
      } catch (error) {
        warnings.add(formatAppSettingsError(error));
      }
    }

    images.push(record);
  }

  return { images, warnings: Array.from(warnings), prompt, negativePrompt };
}

export async function resolveAsset(supabase: SupabaseAdmin, assetId: string, category: DriveAsset["category"]) {
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

async function resolveOptionalAsset(
  supabase: SupabaseAdmin,
  assetId: string | undefined,
  category: DriveAsset["category"],
  dataUrl?: string,
  fileName?: string | null
) {
  if (!assetId && !dataUrl) return null;
  if (dataUrl) {
    return {
      id: assetId || `local-${category}-${Date.now()}`,
      google_drive_file_id: "",
      google_drive_url: null,
      thumbnail_url: dataUrl,
      data_url: dataUrl,
      file_name: fileName || `${category}-reference.png`,
      mime_type: "image/png",
      category,
      sub_category: "本地素材",
      tags: [String(category), "local"],
      source: "local"
    } satisfies DriveAsset;
  }
  return assetId ? resolveAsset(supabase, assetId, category) : null;
}

function validateGeneratePayload(payload: GeneratePayload) {
  if (!payload.sceneAssetId) throw new Error("請先選擇一張場景圖。");
  if (![1, 2, 4].includes(payload.count)) throw new Error("生成數量只支援 1、2 或 4。");
}

async function generateImageWithOpenAI(prompt: string, references: DriveAsset[], payload: GeneratePayload) {
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

  if (payload.sceneDataUrl) {
    const { buffer, mimeType } = imageDataUrlToBuffer(payload.sceneDataUrl);
    if (buffer.length > MAX_REFERENCE_BYTES) throw new Error("臨時場景圖超過 50MB，請先壓縮後再使用。");
    formData.append("image[]", new Blob([buffer], { type: mimeType }), payload.sceneFileName || "temporary-scene.png");
  }

  for (const asset of (payload.sceneDataUrl ? references.slice(1, 5) : references.slice(0, 5))) {
    const localImage = asset.data_url ? imageDataUrlToBuffer(asset.data_url) : null;
    const buffer = localImage?.buffer || await downloadDriveFile(asset.google_drive_file_id);
    if (buffer.length > MAX_REFERENCE_BYTES) {
      throw new Error(`參考圖 ${asset.file_name || asset.google_drive_file_id} 超過 50MB，請先壓縮後再使用。`);
    }
    const blob = new Blob([buffer], { type: localImage?.mimeType || asset.mime_type || "image/png" });
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

async function appendGeneratedLogSafely(image: GeneratedImage, warnings: Set<string>) {
  try {
    await appendGeneratedDriveLog([image]);
  } catch (error) {
    warnings.add(error instanceof Error ? `Drive 成品 manifest 記錄失敗：${error.message}` : "Drive 成品 manifest 記錄失敗。");
  }
}

function explainDriveUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("storageQuotaExceeded") || message.includes("Service Accounts do not have storage quota")) {
    return [
      "圖片已生成，但 Google Drive 上傳失敗：Service Account 沒有個人儲存空間 quota。",
      "要自動上傳 Drive，請把成品資料夾放在 Google Shared Drive，或改用 Google OAuth 使用者授權。",
      "目前已先保存到本機歷史，可在 Gallery 或生成結果補傳/下載。"
    ].join(" ");
  }
  return `圖片已生成，但 Google Drive 上傳失敗：${message}`;
}
