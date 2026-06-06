import { NextRequest, NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const record = await findGeneratedRecord(id);
    const googleDriveFileId = record?.google_drive_file_id || id;

    const buffer = await downloadDriveFile(googleDriveFileId);
    const created = record?.created_at ? new Date(record.created_at).toISOString().slice(0, 10) : "generated";
    const fileName = `${created}_${record?.girl_style || "girl"}_${record?.outfit || "image"}.png`.replace(
      /[^a-z0-9_.-]+/gi,
      "_"
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "下載失敗。" },
      { status: 404 }
    );
  }
}

async function findGeneratedRecord(id: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_images")
      .select("google_drive_file_id, girl_style, outfit, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
