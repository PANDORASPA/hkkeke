import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { formatAppSettingsError, getAppSetting, getOpenAIKeyWithSource } from "@/lib/app-settings";
import { DRIVE_FOLDERS, driveFetch } from "@/lib/google-drive";
import { OPENAI_IMAGE_MODEL, testOpenAIKey } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

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
  ]
};

function missingEnv(keys: string[]) {
  return keys.filter((key) => !process.env[key]);
}

function folderStatus() {
  return Object.fromEntries(Object.entries(DRIVE_FOLDERS).map(([key, value]) => [key, value ? "set" : "missing"]));
}

async function checkDriveRootFolder() {
  const rootId = DRIVE_FOLDERS.root;
  if (!rootId) throw new Error("未設定 Google Drive root folder id。");

  return driveFetch<{ id: string; name: string; mimeType: string }>(
    `https://www.googleapis.com/drive/v3/files/${rootId}?fields=id,name,mimeType&supportsAllDrives=true`
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
    automation: buildAutomationStatus(),
    folders: folderStatus(),
    env: {
      supabase: missingSupabase.length ? `Missing: ${missingSupabase.join(", ")}` : "set",
      googleDrive: missingGoogle.length ? `Missing: ${missingGoogle.join(", ")}` : "set",
      driveFolders: missingFolders.length ? `Missing: ${missingFolders.join(", ")}` : "set",
      openai: "checking",
      openaiSource: "checking",
      openaiModel: OPENAI_IMAGE_MODEL,
      cronSecret: process.env.CRON_SECRET ? "set" : "missing",
      githubOidcAudience: process.env.GITHUB_OIDC_AUDIENCE || "hkkeke-auto-production",
      githubOidcRepository: process.env.GITHUB_OIDC_REPOSITORY || "PANDORASPA/hkkeke",
      dailyAutoImagesPerRun: process.env.DAILY_AUTO_IMAGES_PER_RUN || "5",
      dailyAutoUseReferences: process.env.DAILY_AUTO_USE_REFERENCES || "true",
      autoSceneReplenish: process.env.AUTO_SCENE_REPLENISH || "true",
      autoSceneReserveTarget: process.env.AUTO_SCENE_RESERVE_TARGET || "24",
      autoSceneVariationsPerRun: process.env.AUTO_SCENE_VARIATIONS_PER_RUN || "2"
    }
  };

  try {
    const lastRun = await getAppSetting("AUTO_PRODUCTION_LAST_RUN");
    if (lastRun) result.automation.lastRun = JSON.parse(lastRun);
  } catch {
    result.automation.lastRun = null;
  }

  try {
    if (missingSupabase.length) {
      throw new Error(`Missing Supabase environment variables: ${missingSupabase.join(", ")}.`);
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("app_settings").select("id").limit(1);
    if (error) throw error;
    result.supabase = { ok: true, message: "Supabase 已連接。" };
  } catch (error) {
    result.supabase = { ok: false, message: formatAppSettingsError(error) };
  }

  try {
    if (missingGoogle.length) {
      throw new Error(`Missing Google service account variables: ${missingGoogle.join(", ")}.`);
    }
    if (missingFolders.length) {
      throw new Error(`Missing Google Drive folder IDs: ${missingFolders.join(", ")}.`);
    }
    const folder = await checkDriveRootFolder();
    result.googleDrive = { ok: true, message: `Google Drive 已連接，可讀取 root folder：${folder.name}` };
  } catch (error) {
    result.googleDrive = { ok: false, message: error instanceof Error ? error.message : "Google Drive 連接失敗。" };
  }

  try {
    const { key, source } = await getOpenAIKeyWithSource();
    result.env.openai = key ? "set" : "Missing: OPENAI_API_KEY";
    result.env.openaiSource = source;
    if (!key) {
      throw new Error("未設定 OpenAI API key。可在設定頁輸入，或在 Vercel 設定 OPENAI_API_KEY。");
    }
    const test = await testOpenAIKey(key);
    result.openai = { ok: test.ok, message: test.message };
  } catch (error) {
    result.openai = { ok: false, message: error instanceof Error ? error.message : "OpenAI 連接失敗。" };
  }

  return NextResponse.json(result);
}

function buildAutomationStatus() {
  const cronSecretSet = Boolean(process.env.CRON_SECRET);
  const workflowPath = join(process.cwd(), ".github", "workflows", "auto-production.yml");
  const workflowExists = existsSync(workflowPath);
  const workflowText = workflowExists ? readFileSync(workflowPath, "utf8") : "";
  const hourlyWorkflow = workflowText.includes("cron: \"0 * * * *\"");
  const oidcWorkflow = workflowText.includes("id-token: write") && workflowText.includes("ACTIONS_ID_TOKEN_REQUEST_URL");
  const targetPerRun = Number(process.env.DAILY_AUTO_IMAGES_PER_RUN || "5");
  const safeTarget = Number.isFinite(targetPerRun) ? targetPerRun : 5;

  return {
    ok: (cronSecretSet || oidcWorkflow) && workflowExists && hourlyWorkflow,
    message: oidcWorkflow
      ? "GitHub Actions OIDC 每小時自動生產已啟用，不需要 GitHub repository secret。"
      : cronSecretSet
        ? "Vercel 端自動生產 route 已受 CRON_SECRET 保護。"
        : "未設定 CRON_SECRET，亦未啟用 GitHub OIDC，自動生產不會執行。",
    cronSecret: cronSecretSet ? "set" : "missing",
    vercelDailyCron: "set",
    githubHourlyWorkflow: workflowExists && hourlyWorkflow ? "set" : "missing",
    githubOidc: oidcWorkflow ? "set" : "missing",
    targetPerRun: String(safeTarget),
    estimatedDailyImages: workflowExists && hourlyWorkflow ? String(safeTarget * 24) : String(safeTarget),
    sceneReplenish: process.env.AUTO_SCENE_REPLENISH || "true",
    sceneReserveTarget: process.env.AUTO_SCENE_RESERVE_TARGET || "24",
    sceneVariationsPerRun: process.env.AUTO_SCENE_VARIATIONS_PER_RUN || "2",
    route: "/api/auto-production",
    lastRun: null as unknown
  };
}
