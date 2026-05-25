import { NextResponse } from "next/server";
import { listDriveAssets } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const assets = await listDriveAssets();
    const supabase = getSupabaseAdmin();

    if (assets.length) {
      const { error } = await supabase
        .from("drive_assets")
        .upsert(assets, { onConflict: "google_drive_file_id" });
      if (error) throw error;
    }

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
