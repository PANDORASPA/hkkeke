import { NextRequest, NextResponse } from "next/server";
import { formatAppSettingsError } from "@/lib/app-settings";
import { appendGeneratedDriveLog } from "@/lib/generated-drive-log";
import { uploadGeneratedImage } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GeneratedImage } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const fileName = String(form.get("fileName") || "generated.png");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少圖片檔案。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGeneratedImage(buffer, fileName);
    const baseRecord = {
      prompt: nullableString(form.get("prompt")),
      negative_prompt: nullableString(form.get("negativePrompt")),
      scene_asset_id: nullableString(form.get("sceneAssetId")),
      girl_reference_asset_id: nullableString(form.get("girlReferenceAssetId")),
      outfit_asset_id: nullableString(form.get("outfitAssetId")),
      hair_asset_id: nullableString(form.get("hairAssetId")),
      pose_asset_id: nullableString(form.get("poseAssetId")),
      girl_style: nullableString(form.get("girlStyle")),
      hairstyle: nullableString(form.get("hairStyle")),
      hair_color: nullableString(form.get("hairColor")),
      outfit: nullableString(form.get("outfit")),
      expression: nullableString(form.get("expression")),
      body_type: nullableString(form.get("bodyType")),
      pose: nullableString(form.get("pose"))
    };
    const driveRecord: GeneratedImage = {
      id: uploaded.google_drive_file_id,
      google_drive_file_id: uploaded.google_drive_file_id,
      google_drive_url: uploaded.google_drive_url,
      thumbnail_url: uploaded.thumbnail_url,
      file_name: uploaded.file_name,
      upload_warning: null,
      ...baseRecord,
      created_at: new Date().toISOString(),
      source: "drive"
    };
    const warnings: string[] = [];
    let record = null;

    try {
      await appendGeneratedDriveLog([driveRecord]);
    } catch (error) {
      warnings.push(error instanceof Error ? `Drive 成品 manifest 記錄失敗：${error.message}` : "Drive 成品 manifest 記錄失敗。");
    }

    if (baseRecord.prompt) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from("generated_images").insert({
          google_drive_file_id: uploaded.google_drive_file_id,
          google_drive_url: uploaded.google_drive_url,
          thumbnail_url: uploaded.thumbnail_url,
          ...baseRecord
        }).select("*").single();
        if (error) throw error;
        record = data;
      } catch (error) {
        warnings.push(formatAppSettingsError(error));
      }
    }

    return NextResponse.json({ ...uploaded, record, warnings });
  } catch (error) {
    return NextResponse.json({ error: explainDriveUploadError(error) }, { status: 500 });
  }
}

function nullableString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function explainDriveUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("storageQuotaExceeded") || message.includes("Service Accounts do not have storage quota")) {
    return "Google Drive 上傳失敗：Service Account 沒有個人儲存空間 quota。請把成品資料夾放在 Shared Drive，或改用 Google OAuth 使用者授權。";
  }
  return `上傳成品到 Google Drive 失敗：${message}`;
}
