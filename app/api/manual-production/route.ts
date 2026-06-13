import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKeyFromCookie } from "@/lib/openai-key-cookie";
import { runProduction } from "@/lib/production-runner";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const cookieKey = await getOpenAIKeyFromCookie();
    if (!cookieKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "請先在設定頁儲存 OpenAI API key，再用同一個瀏覽器執行手動試跑。"
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      targetImages?: number;
      seed?: string;
      includeReferences?: boolean;
    };

    const result = await runProduction({
      mode: "manual-production-test",
      authMode: "browser-cookie",
      targetImages: clamp(Number(body.targetImages || 1), 1, 4),
      seed: body.seed || `manual-${new Date().toISOString().slice(0, 16)}`,
      includeReferences: body.includeReferences ?? true,
      maxImages: 4
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = (error as Error).name === "MissingSceneAssetError" ? 400 : 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "手動試跑失敗。" },
      { status }
    );
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
