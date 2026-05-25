import { NextResponse } from "next/server";
import { DRIVE_FOLDERS, listDriveAssets } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ENV_GROUPS = {
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  googleDrive: ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY"],
  driveFolders: [
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    "GOOGLE_DRIVE_SCENES_FOLDER_ID",
    "GOOGLE_DRIVE_GIRLS_FOLDER_ID",
    "GOOGLE_DRIVE_OUTFITS_FOLDER_ID",
    "GOOGLE_DRIVE_HAIR_FOLDER_ID",
    "GOOGLE_DRIVE_POSES_FOLDER_ID",
    "GOOGLE_DRIVE_GENERATED_FOLDER_ID"
  ],
  openai: ["OPENAI_API_KEY"]
};

function missingEnv(keys: string[]) {
  return keys.filter((key) => !process.env[key]);
}

function folderStatus() {
  return Object.fromEntries(
    Object.entries(DRIVE_FOLDERS).map(([key, value]) => [key, value ? "set" : "missing"])
  );
}

export async function GET() {
  const missingSupabase = missingEnv(ENV_GROUPS.supabase);
  const missingGoogle = missingEnv(ENV_GROUPS.googleDrive);
  const missingFolders = missingEnv(ENV_GROUPS.driveFolders);

  const result = {
    supabase: { ok: false, message: "" },
    googleDrive: { ok: false, message: "" },
    openai: { ok: false, message: "" },
    folders: folderStatus(),
    env: {
      supabase: missingSupabase.length ? `Missing: ${missingSupabase.join(", ")}` : "set",
      googleDrive: missingGoogle.length ? `Missing: ${missingGoogle.join(", ")}` : "set",
      driveFolders: missingFolders.length ? `Missing: ${missingFolders.join(", ")}` : "set",
      openai: process.env.OPENAI_API_KEY ? "set" : "Missing: OPENAI_API_KEY"
    }
  };

  try {
    if (missingSupabase.length) throw new Error(`Missing Supabase environment variables: ${missingSupabase.join(", ")}.`);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("app_settings").select("id").limit(1);
    if (error) throw error;
    result.supabase = { ok: true, message: "Supabase connected." };
  } catch (error) {
    result.supabase = { ok: false, message: error instanceof Error ? error.message : "Supabase failed." };
  }

  try {
    if (missingGoogle.length) throw new Error(`Missing Google service account variables: ${missingGoogle.join(", ")}.`);
    if (missingFolders.length) throw new Error(`Missing Google Drive folder IDs: ${missingFolders.join(", ")}.`);
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
