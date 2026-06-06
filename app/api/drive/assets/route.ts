import { NextResponse } from "next/server";
import { listDriveAssets } from "@/lib/google-drive";
import { formatAppSettingsError } from "@/lib/app-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "未知錯誤。";
  }
}

export async function GET() {
  try {
    const assets = await listDriveAssets();
    let sync = { ok: true, message: "已同步到 Supabase。" };

    if (assets.length) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from("drive_assets")
          .upsert(assets, { onConflict: "google_drive_file_id" });
        if (error) throw error;
      } catch (error) {
        sync = {
          ok: false,
          message: formatAppSettingsError(error)
        };
      }
    } else {
      sync = { ok: true, message: "Google Drive 已連接，但未找到圖片素材。" };
    }

    return NextResponse.json({ assets, sync });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
