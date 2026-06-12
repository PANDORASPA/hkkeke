import { NextRequest, NextResponse } from "next/server";
import {
  BODY_TYPES,
  EXPRESSIONS,
  GIRL_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  POSES
} from "@/lib/options";
import { listDriveAssets } from "@/lib/google-drive";
import { verifyGitHubOidcToken } from "@/lib/github-oidc";
import { generateImagesFromPayload } from "@/lib/server-generation";
import { AssetCategory, DriveAsset, GeneratePayload } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 300;

type AssetsByCategory = Record<AssetCategory, DriveAsset[]>;

export async function GET(request: NextRequest) {
  return runAutomatedProduction(request);
}

export async function POST(request: NextRequest) {
  return runAutomatedProduction(request);
}

async function runAutomatedProduction(request: NextRequest) {
  try {
    const authMode = await authorizeCronRequest(request);
    const url = new URL(request.url);
    const requestedTarget = Number(url.searchParams.get("target") || process.env.DAILY_AUTO_IMAGES_PER_RUN || "5");
    const targetImages = clamp(requestedTarget, 1, 12);
    const seed = url.searchParams.get("seed") || process.env.DAILY_AUTO_SEED || dailySeed();
    const includeReferences = (url.searchParams.get("references") || process.env.DAILY_AUTO_USE_REFERENCES || "true") !== "false";
    const maxJobs = Math.ceil(targetImages / 4);

    const assets = groupAssets(await listDriveAssets());
    if (!assets.scene.length) {
      return NextResponse.json({ ok: false, error: "自動生產需要至少一張 Drive 場景素材。" }, { status: 400 });
    }

    const jobs = buildProductionPayloads({ assets, targetImages, seed, includeReferences, maxJobs });
    const batches = [];
    let generatedCount = 0;
    const warnings = new Set<string>();

    for (const job of jobs) {
      const result = await generateImagesFromPayload(job.payload);
      generatedCount += result.images.length;
      for (const warning of result.warnings) warnings.add(warning);
      batches.push({
        label: job.label,
        requested: job.payload.count,
        generated: result.images.length,
        imageIds: result.images.map((image) => image.id),
        driveUrls: result.images.map((image) => image.google_drive_url).filter(Boolean)
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "server-cron-production",
      authMode,
      seed,
      targetImages,
      generatedCount,
      jobs: batches.length,
      batches,
      warnings: Array.from(warnings)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "自動生產失敗。" },
      { status: 500 }
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

function buildProductionPayloads(input: {
  assets: AssetsByCategory;
  targetImages: number;
  seed: string;
  includeReferences: boolean;
  maxJobs: number;
}) {
  const shuffledScenes = seededShuffle(input.assets.scene, `${input.seed}:scene`);
  const shuffledGirls = seededShuffle(input.assets.girl, `${input.seed}:girl`);
  const shuffledOutfits = seededShuffle(input.assets.outfit, `${input.seed}:outfit`);
  const shuffledHair = seededShuffle(input.assets.hair, `${input.seed}:hair`);
  const shuffledPoses = seededShuffle(input.assets.pose, `${input.seed}:pose`);
  const jobs: Array<{ label: string; payload: GeneratePayload }> = [];
  let remaining = input.targetImages;

  for (let index = 0; remaining > 0 && index < input.maxJobs; index += 1) {
    const count = normalizeCount(Math.min(4, remaining));
    const scene = shuffledScenes[index % shuffledScenes.length];
    const girl = input.includeReferences ? pickOptional(shuffledGirls, index) : undefined;
    const outfitAsset = input.includeReferences ? pickOptional(shuffledOutfits, index + 1) : undefined;
    const hairAsset = input.includeReferences ? pickOptional(shuffledHair, index + 2) : undefined;
    const poseAsset = input.includeReferences ? pickOptional(shuffledPoses, index + 3) : undefined;
    const girlStyle = pick(GIRL_STYLES, input.seed, "girl-style", index);
    const hairStyle = pick(HAIR_STYLES, input.seed, "hair-style", index * 2 + 1);
    const hairColor = pick(HAIR_COLORS, input.seed, "hair-color", index * 3 + 2);
    const outfit = pick(OUTFITS, input.seed, "outfit", index * 5 + 1);
    const bodyType = pick(BODY_TYPES, input.seed, "body-type", index * 7 + 3);
    const expression = pick(EXPRESSIONS, input.seed, "expression", index * 2 + 4);
    const pose = pick(POSES, input.seed, "pose", index * 3 + 1);

    jobs.push({
      label: `${assetName(scene)} / ${girlStyle} / ${outfit} / ${count}`,
      payload: {
        sceneAssetId: scene.google_drive_file_id,
        girlReferenceAssetId: girl?.google_drive_file_id || undefined,
        outfitAssetId: outfitAsset?.google_drive_file_id || undefined,
        hairAssetId: hairAsset?.google_drive_file_id || undefined,
        poseAssetId: poseAsset?.google_drive_file_id || undefined,
        girlStyle,
        hairStyle,
        hairColor,
        outfit,
        bodyType,
        expression,
        pose,
        count,
        extraPrompt: [
          "Automated daily production run.",
          "Keep each image visually distinct from previous outputs.",
          "Vary camera distance, angle, lighting, body orientation and micro-pose.",
          "Keep the result realistic, non-explicit, adult fashion photography."
        ].join("\n")
      }
    });

    remaining -= count;
  }

  return jobs;
}

function groupAssets(assets: DriveAsset[]) {
  const grouped: AssetsByCategory = {
    scene: [],
    girl: [],
    outfit: [],
    hair: [],
    pose: []
  };
  for (const asset of assets) {
    const category = asset.category as AssetCategory;
    if (category in grouped) grouped[category].push(asset);
  }
  return grouped;
}

function pick<T>(items: T[], seed: string, salt: string, index: number) {
  const shuffled = seededShuffle(items, `${seed}:${salt}`);
  return shuffled[index % shuffled.length];
}

function pickOptional<T>(items: T[], index: number) {
  return items.length ? items[index % items.length] : undefined;
}

function seededShuffle<T>(items: T[], seed: string) {
  return [...items]
    .map((item, index) => ({ item, score: hashString(`${seed}:${index}`) }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeCount(value: number): 1 | 2 | 4 {
  if (value >= 4) return 4;
  if (value >= 2) return 2;
  return 1;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function dailySeed() {
  return `auto-${new Date().toISOString().slice(0, 10)}`;
}

function assetName(asset: DriveAsset) {
  return asset.sub_category ? `${asset.sub_category}/${asset.file_name}` : asset.file_name || asset.google_drive_file_id;
}
