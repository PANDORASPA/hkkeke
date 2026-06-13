import { NextResponse } from "next/server";
import { formatAppSettingsError } from "@/lib/app-settings";
import { readGeneratedDriveLog } from "@/lib/generated-drive-log";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GeneratedImage } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  const warnings: string[] = [];
  const imagesById = new Map<string, GeneratedImage>();

  try {
    const driveImages = await readGeneratedDriveLog();
    for (const image of driveImages) {
      imagesById.set(stableImageKey(image), { ...image, source: "drive" });
    }
  } catch (error) {
    warnings.push(error instanceof Error ? `Drive 成品紀錄讀取失敗：${error.message}` : "Drive 成品紀錄讀取失敗。");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("generated_images").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(formatAppSettingsError(error));
    for (const image of data || []) {
      imagesById.set(stableImageKey(image as GeneratedImage), { ...(image as GeneratedImage), source: "supabase" });
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Supabase 圖庫讀取失敗。");
  }

  const images = Array.from(imagesById.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (!images.length && warnings.length) {
    return NextResponse.json({ images, warnings, error: warnings.join(" ") }, { status: 200 });
  }

  return NextResponse.json({ images, warnings });
}

function stableImageKey(image: GeneratedImage) {
  return image.google_drive_file_id || image.id || image.google_drive_url || image.created_at;
}
