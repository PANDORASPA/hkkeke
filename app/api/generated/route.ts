import { NextResponse } from "next/server";
import { formatAppSettingsError } from "@/lib/app-settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(formatAppSettingsError(error));
    return NextResponse.json({ images: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "讀取圖庫失敗。" },
      { status: 500 }
    );
  }
}
