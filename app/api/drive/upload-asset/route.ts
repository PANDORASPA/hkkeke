import { NextRequest, NextResponse } from "next/server";
import { imageDataUrlToBuffer } from "@/lib/image-data";
import { uploadAssetImage } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AssetCategory } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

const allowedCategories: AssetCategory[] = ["scene", "girl", "outfit", "hair", "pose"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      category?: AssetCategory;
      dataUrl?: string;
      fileName?: string;
    };

    if (!body.category || !allowedCategories.includes(body.category)) {
      return NextResponse.json({ error: "素材分類不正確。" }, { status: 400 });
    }
    if (!body.dataUrl) {
      return NextResponse.json({ error: "缺少圖片資料。" }, { status: 400 });
    }

    const image = imageDataUrlToBuffer(body.dataUrl);
    const fileName = sanitizeFileName(body.fileName || `${body.category}_${Date.now()}.png`);
    const asset = await uploadAssetImage(image.buffer, fileName, body.category, image.mimeType);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("drive_assets").upsert(asset, { onConflict: "google_drive_file_id" });
    } catch {
      // Drive upload is the source of truth here; Supabase can resync on the next asset sync.
    }

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json({ error: explainDriveUploadError(error) }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  const clean = value.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return clean.toLowerCase().endsWith(".png") ? clean : `${clean || "asset"}.png`;
}

function explainDriveUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("storageQuotaExceeded") || message.includes("Service Accounts do not have storage quota")) {
    return "Google Drive 上傳失敗：Service Account 沒有個人儲存空間 quota。請把目標資料夾放在 Shared Drive，或改用有授權的 Google OAuth。";
  }
  return `Google Drive 上傳失敗：${message}`;
}
