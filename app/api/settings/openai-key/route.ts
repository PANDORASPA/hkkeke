import { NextRequest, NextResponse } from "next/server";
import { OPENAI_KEY_NAME, formatAppSettingsError, getOpenAIKeyWithSource, setAppSetting } from "@/lib/app-settings";
import { setDriveAppSetting } from "@/lib/drive-app-settings";
import { setOpenAIKeyCookie } from "@/lib/openai-key-cookie";
import { maskOpenAIKey, testOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export async function GET() {
  try {
    const { key, source } = await getOpenAIKeyWithSource();
    return NextResponse.json({
      configured: Boolean(key),
      masked: maskOpenAIKey(key),
      source
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "讀取 OpenAI 設定失敗。" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { apiKey?: string };
    const apiKey = body.apiKey?.trim();

    if (!apiKey) throw new Error("請輸入 OpenAI API key。");
    if (!apiKey.startsWith("sk-")) throw new Error("OpenAI API key 格式似乎不正確，應該以 sk- 開頭。");

    const test = await testOpenAIKey(apiKey);
    if (!test.ok && !test.canStore) {
      return NextResponse.json({ error: test.message, status: test.status }, { status: 400 });
    }

    let supabaseStored = false;
    let supabaseMessage = "";
    let driveStored = false;
    let driveMessage = "";
    try {
      await setAppSetting(OPENAI_KEY_NAME, apiKey);
      supabaseStored = true;
    } catch (error) {
      supabaseMessage = formatAppSettingsError(error);
    }
    try {
      await setDriveAppSetting(OPENAI_KEY_NAME, apiKey);
      driveStored = true;
    } catch (error) {
      driveMessage = error instanceof Error ? error.message : "保存到 Google Drive 設定檔失敗。";
    }

    const response = NextResponse.json({
      configured: true,
      masked: maskOpenAIKey(apiKey),
      source: supabaseStored ? "supabase+cookie" : driveStored ? "drive+cookie" : "cookie",
      supabaseStored,
      supabaseMessage,
      driveStored,
      driveMessage,
      test,
      message: buildSaveMessage(test.ok, supabaseStored, supabaseMessage, driveStored, driveMessage)
    });
    setOpenAIKeyCookie(response, apiKey);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "儲存 OpenAI API key 失敗。" },
      { status: 400 }
    );
  }
}

function buildSaveMessage(
  testOk: boolean,
  supabaseStored: boolean,
  supabaseMessage: string,
  driveStored: boolean,
  driveMessage: string
) {
  const lines = [
    testOk
      ? "OpenAI API key 已測試成功。"
      : "OpenAI API key 已保存，但 OpenAI 回應 403 權限問題。請按提示修正 OpenAI Project/Organization 權限後再測試。"
  ];

  if (supabaseStored) lines.push("已同步保存到 Supabase app_settings。");
  if (driveStored) lines.push("已加密保存到 Google Drive root 設定檔，全自動任務可由 server-side 讀取。");
  lines.push("已保存到本機瀏覽器 httpOnly cookie，手動生成可即時使用。");
  if (!supabaseStored && !driveStored) {
    lines.push("Supabase 和 Google Drive 設定檔都未能保存；目前只有本機 cookie 可用，全自動任務仍未 ready。");
  }

  if (supabaseMessage) lines.push(supabaseMessage);
  if (driveMessage) lines.push(driveMessage);
  return lines.join("\n");
}
