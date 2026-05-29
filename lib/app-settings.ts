import { getSupabaseAdmin } from "./supabase-admin";

export async function getAppSetting(key: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.value === "string" ? data.value : null;
}

export async function setAppSetting(key: string, value: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw error;
}

export async function getOpenAIKey() {
  return (await getAppSetting("OPENAI_API_KEY")) || process.env.OPENAI_API_KEY || "";
}
