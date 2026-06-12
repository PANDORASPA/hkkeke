import { NextRequest, NextResponse } from "next/server";
import { uploadGeneratedImage } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    let record = null;

    const prompt = String(form.get("prompt") || "");
    if (prompt) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
          .from("generated_images")
          .insert({
            google_drive_file_id: uploaded.google_drive_file_id,
            google_drive_url: uploaded.google_drive_url,
            thumbnail_url: uploaded.thumbnail_url,
            prompt,
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
          })
          .select("*")
          .single();
        record = data;
      } catch {
        // Drive upload succeeded; Supabase can be repaired manually or by future sync.
      }
    }

    return NextResponse.json({ ...uploaded, record });
  } catch (error) {
    return NextResponse.json(
      { error: explainDriveUploadError(error) },
      { status: 500 }
    );
  }
}

function nullableString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function explainDriveUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("storageQuotaExceeded") || message.includes("Service Accounts do not have storage quota")) {
    return "Google Drive 上傳失敗：Service Account 沒有個人儲存 quota。請把成品資料夾放在 Shared Drive，或改用 Google OAuth 使用者授權。";
  }
  return `上傳成品到 Google Drive 失敗：${message}`;
}
