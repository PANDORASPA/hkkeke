import { NextRequest, NextResponse } from "next/server";
import {
  OPENAI_KEY_NAME,
  formatAppSettingsError,
  getOpenAIKeyWithSource,
  setAppSetting
} from "@/lib/app-settings";
import { setOpenAIKeyCookie } from "@/lib/openai-key-cookie";
import { maskOpenAIKey, testOpenAIKey } from "@/lib/openai";

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
    if (!apiKey.startsWith("sk-")) throw new Error("OpenAI API key 格式似乎不正確，應以 sk- 開頭。");

    const test = await testOpenAIKey(apiKey);
    if (!test.ok && !test.canStore) {
      return NextResponse.json({ error: test.message, status: test.status }, { status: 400 });
    }

    let supabaseStored = false;
    let supabaseMessage = "";
    try {
      await setAppSetting(OPENAI_KEY_NAME, apiKey);
      supabaseStored = true;
    } catch (error) {
      supabaseMessage = formatAppSettingsError(error);
    }

    const response = NextResponse.json({
      configured: true,
      masked: maskOpenAIKey(apiKey),
      source: supabaseStored ? "supabase+cookie" : "cookie",
      supabaseStored,
      supabaseMessage,
      test,
      message: buildSaveMessage(test.ok, supabaseStored, supabaseMessage)
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

function buildSaveMessage(testOk: boolean, supabaseStored: boolean, supabaseMessage: string) {
  const lines = [
    testOk
      ? "OpenAI API key 已測試成功。"
      : "OpenAI API key 已保存，但 OpenAI 回傳 403 權限問題。請按提示修正 OpenAI Project/Organization 權限後再測試。"
  ];

  lines.push(
    supabaseStored
      ? "已同步保存到 Supabase app_settings，亦已保存到本瀏覽器 httpOnly cookie。"
      : "Supabase 暫時不可用，已先保存到本瀏覽器 httpOnly cookie；Supabase 恢復後可再按一次保存同步。"
  );

  if (supabaseMessage) lines.push(supabaseMessage);
  return lines.join("\n");
}
