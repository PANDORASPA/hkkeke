import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ images: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
