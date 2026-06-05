import { getSupabaseAdmin } from "./supabase-admin";

export const OPENAI_KEY_NAME = "OPENAI_API_KEY";

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function formatAppSettingsError(error: unknown) {
  const err = error as SupabaseLikeError;
  const message = err?.message || "";
  const code = err?.code || "";
  const details = err?.details || "";
  const hint = err?.hint || "";
  const combined = [message, details, hint].filter(Boolean).join(" ");

  if (code === "42P01" || combined.includes("app_settings") || combined.includes("relation")) {
    return "Supabase 的 app_settings 表不存在或未暴露。請先套用 supabase/migrations/001_ai_girl_generator.sql。";
  }

  if (
    combined.includes("fetch failed") ||
    combined.includes("Failed to fetch") ||
    combined.includes("project is paused") ||
    combined.includes("paused")
  ) {
    return "Supabase project 目前連接不到，常見原因是 project paused。請先到 Supabase dashboard Restore/Unpause project，再回來測試。";
  }

  if (!combined) {
    return "Supabase app_settings 讀寫失敗。請檢查 project 是否 paused、service role key 是否正確，以及 migration 是否已套用。";
  }

  return combined;
}

export async function getAppSetting(key: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(formatAppSettingsError(error));
  return typeof data?.value === "string" ? data.value : null;
}

export async function setAppSetting(key: string, value: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw new Error(formatAppSettingsError(error));
}

export async function getOpenAIKey() {
  const envKey = process.env.OPENAI_API_KEY || "";
  try {
    const fromDb = await getAppSetting(OPENAI_KEY_NAME);
    if (fromDb) return fromDb;
  } catch (error) {
    if (envKey) return envKey;
    throw error;
  }
  return envKey;
}
