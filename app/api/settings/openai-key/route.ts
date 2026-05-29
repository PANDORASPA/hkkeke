import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKey, setAppSetting } from "@/lib/app-settings";

function maskKey(key: string) {
  if (!key) return "";
  if (key.length <= 12) return "已儲存";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export async function GET() {
  try {
    const key = await getOpenAIKey();
    return NextResponse.json({
      configured: Boolean(key),
      masked: maskKey(key),
      source: key ? "settings-or-env" : "missing"
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "讀取設定失敗。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { apiKey?: string };
    const apiKey = body.apiKey?.trim();

    if (!apiKey) throw new Error("請輸入 OpenAI API key。");
    if (!apiKey.startsWith("sk-")) throw new Error("OpenAI API key 格式似乎不正確，應以 sk- 開頭。");

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 測試失敗：HTTP ${response.status}`);
    }

    await setAppSetting("OPENAI_API_KEY", apiKey);
    return NextResponse.json({ configured: true, masked: maskKey(apiKey), message: "OpenAI API key 已儲存並測試成功。" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "儲存 OpenAI API key 失敗。" }, { status: 400 });
  }
}
