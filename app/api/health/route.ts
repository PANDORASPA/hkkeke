import { NextResponse } from "next/server";
import { DRIVE_FOLDERS, listDriveAssets } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const result = {
    supabase: { ok: false, message: "" },
    googleDrive: { ok: false, message: "" },
    openai: { ok: false, message: "" },
    folders: DRIVE_FOLDERS
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("app_settings").select("id").limit(1);
    if (error) throw error;
    result.supabase = { ok: true, message: "Supabase connected." };
  } catch (error) {
    result.supabase = { ok: false, message: error instanceof Error ? error.message : "Supabase failed." };
  }

  try {
    const assets = await listDriveAssets();
    result.googleDrive = { ok: true, message: `Google Drive connected. ${assets.length} image assets found.` };
  } catch (error) {
    result.googleDrive = { ok: false, message: error instanceof Error ? error.message : "Google Drive failed." };
  }

  try {
    if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    if (!response.ok) throw new Error(`OpenAI API returned ${response.status}.`);
    result.openai = { ok: true, message: "OpenAI connected." };
  } catch (error) {
    result.openai = { ok: false, message: error instanceof Error ? error.message : "OpenAI failed." };
  }

  return NextResponse.json(result);
}
