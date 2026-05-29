import { NextRequest, NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_images")
      .select("google_drive_file_id, girl_style, outfit, created_at")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data?.google_drive_file_id) throw new Error("找不到 Google Drive 檔案。");

    const buffer = await downloadDriveFile(data.google_drive_file_id);
    const created = data.created_at ? new Date(data.created_at).toISOString().slice(0, 10) : "generated";
    const fileName = `${created}_${data.girl_style || "girl"}_${data.outfit || "image"}.png`.replace(/[^a-z0-9_.-]+/gi, "_");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "下載失敗。" }, { status: 404 });
  }
}
