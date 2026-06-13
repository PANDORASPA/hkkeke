import { NextRequest, NextResponse } from "next/server";
import { verifyGitHubOidcToken } from "@/lib/github-oidc";
import { runProduction } from "@/lib/production-runner";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return handleCronProduction(request);
}

export async function POST(request: NextRequest) {
  return handleCronProduction(request);
}

async function handleCronProduction(request: NextRequest) {
  try {
    const authMode = await authorizeCronRequest(request);
    const url = new URL(request.url);
    const targetImages = clamp(Number(url.searchParams.get("target") || process.env.DAILY_AUTO_IMAGES_PER_RUN || "5"), 1, 12);
    const seed = url.searchParams.get("seed") || process.env.DAILY_AUTO_SEED || undefined;
    const includeReferences = (url.searchParams.get("references") || process.env.DAILY_AUTO_USE_REFERENCES || "true") !== "false";

    const result = await runProduction({
      mode: "server-cron-production",
      authMode,
      targetImages,
      seed,
      includeReferences,
      maxImages: 12
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = (error as Error).name === "MissingSceneAssetError" ? 400 : 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "自動生產失敗。" },
      { status }
    );
  }
}

async function authorizeCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const querySecret = new URL(request.url).searchParams.get("secret") || "";

  if (secret && (auth === `Bearer ${secret}` || querySecret === secret)) {
    return "cron-secret";
  }

  if (auth.startsWith("Bearer ")) {
    await verifyGitHubOidcToken(auth.slice("Bearer ".length));
    return "github-oidc";
  }

  if (!secret) {
    throw new Error("未設定 CRON_SECRET，亦沒有有效 GitHub OIDC token；為安全起見不會執行自動生產。");
  }
  throw new Error("沒有權限執行自動生產。");
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
