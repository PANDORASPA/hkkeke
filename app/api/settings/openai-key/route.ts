import { NextRequest, NextResponse } from "next/server";
import { OPENAI_KEY_NAME, getOpenAIKey, setAppSetting } from "@/lib/app-settings";
import { maskOpenAIKey, testOpenAIKey } from "@/lib/openai";

export async function GET() {
  try {
    const key = await getOpenAIKey();
    return NextResponse.json({
      configured: Boolean(key),
      masked: maskOpenAIKey(key),
      source: key ? "settings-or-env" : "missing"
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

    await setAppSetting(OPENAI_KEY_NAME, apiKey);
    return NextResponse.json({
      configured: true,
      masked: maskOpenAIKey(apiKey),
      test,
      message: test.ok
        ? "OpenAI API key 已儲存並測試成功。"
        : "OpenAI API key 已儲存，但 OpenAI 回傳 403 權限問題。請按提示修正 OpenAI Project/Organization 權限後再測試。"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "儲存 OpenAI API key 失敗。" },
      { status: 400 }
    );
  }
}
