import {
  BODY_TYPES,
  EXPRESSIONS,
  GIRL_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  POSES
} from "./options";
import { setAppSetting } from "./app-settings";
import { listDriveAssets, uploadAssetImage } from "./google-drive";
import { generateSceneVariation, makeSceneVariationFileName } from "./scene-generation";
import { generateImagesFromPayload } from "./server-generation";
import { getSupabaseAdmin } from "./supabase-admin";
import { AssetCategory, DriveAsset, GeneratePayload } from "./types";

type AssetsByCategory = Record<AssetCategory, DriveAsset[]>;

export type ProductionRunInput = {
  authMode: string;
  targetImages: number;
  seed?: string;
  includeReferences?: boolean;
  maxImages?: number;
  mode?: string;
};

export async function runProduction(input: ProductionRunInput) {
  let runId = "";
  const authMode = input.authMode;
  const targetImages = clamp(input.targetImages, 1, input.maxImages || 12);
  const seed = input.seed || dailySeed();

  try {
    const includeReferences = input.includeReferences ?? true;
    const maxJobs = Math.ceil(targetImages / 4);
    runId = `${input.mode || "auto"}-${Date.now()}`;

    await recordProductionRun({
      id: runId,
      status: "running",
      authMode,
      seed,
      targetImages,
      startedAt: new Date().toISOString()
    });

    const assets = groupAssets(await listDriveAssets());
    if (!assets.scene.length) {
      const error = "自動生產需要至少一張 Google Drive 場景素材。";
      await recordProductionRun({
        id: runId,
        status: "failed",
        authMode,
        seed,
        targetImages,
        finishedAt: new Date().toISOString(),
        error
      });
      const missingSceneError = new Error(error);
      missingSceneError.name = "MissingSceneAssetError";
      throw missingSceneError;
    }

    const warnings = new Set<string>();
    const sceneReplenish = await replenishSceneReserve(assets.scene);
    if (sceneReplenish.assets.length) {
      assets.scene = [...sceneReplenish.assets, ...assets.scene];
    }
    for (const warning of sceneReplenish.warnings) warnings.add(warning);

    const jobs = buildProductionPayloads({ assets, targetImages, seed, includeReferences, maxJobs });
    const batches = [];
    let generatedCount = 0;

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

    const runLog = {
      id: runId,
      status: "success",
      authMode,
      seed,
      targetImages,
      generatedCount,
      jobs: batches.length,
      sceneReplenish,
      warnings: Array.from(warnings),
      finishedAt: new Date().toISOString()
    };
    await recordProductionRun(runLog);

    return {
      ok: true,
      mode: input.mode || "server-production",
      authMode,
      seed,
      targetImages,
      generatedCount,
      jobs: batches.length,
      sceneReplenish,
      batches,
      warnings: Array.from(warnings)
    };
  } catch (error) {
    if (runId && (error as Error).name !== "MissingSceneAssetError") {
      await recordProductionRun({
        id: runId,
        status: "failed",
        authMode,
        seed,
        targetImages,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "自動生產失敗。"
      });
    }
    throw error;
  }
}

async function replenishSceneReserve(existingScenes: DriveAsset[]) {
  const enabled = (process.env.AUTO_SCENE_REPLENISH || "true") !== "false";
  const targetReserve = clamp(Number(process.env.AUTO_SCENE_RESERVE_TARGET || "24"), 1, 500);
  const variationsPerRun = clamp(Number(process.env.AUTO_SCENE_VARIATIONS_PER_RUN || "2"), 0, 12);
  const needed = Math.max(0, targetReserve - existingScenes.length);
  const createCount = enabled ? Math.min(needed, variationsPerRun) : 0;
  const assets: DriveAsset[] = [];
  const warnings: string[] = [];

  if (!createCount) {
    return {
      enabled,
      targetReserve,
      beforeCount: existingScenes.length,
      createdCount: 0,
      afterEstimate: existingScenes.length,
      assets,
      warnings
    };
  }

  for (let index = 0; index < createCount; index += 1) {
    try {
      const source = existingScenes[index % existingScenes.length];
      const result = await generateSceneVariation({
        sceneAssetId: source.google_drive_file_id,
        sceneName: source.sub_category || source.file_name || "Scene",
        extraPrompt: [
          "Automatic scene reserve expansion before image production.",
          "Create a fresh realistic empty background, same location category, different exact camera angle and environmental details."
        ].join("\n")
      });
      const asset = await uploadAssetImage(result.buffer, makeSceneVariationFileName(source), "scene", "image/png");
      assets.push(asset);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "場景自動補貨失敗。");
      break;
    }
  }

  if (assets.length) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("drive_assets").upsert(assets, { onConflict: "google_drive_file_id" });
      if (error) throw error;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "場景素材已上傳 Drive，但同步 Supabase 失敗。");
    }
  }

  return {
    enabled,
    targetReserve,
    beforeCount: existingScenes.length,
    createdCount: assets.length,
    afterEstimate: existingScenes.length + assets.length,
    assets,
    warnings
  };
}

async function recordProductionRun(value: Record<string, unknown>) {
  try {
    await setAppSetting("AUTO_PRODUCTION_LAST_RUN", JSON.stringify(value));
  } catch {
    // Logging should never stop image production.
  }
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
          "Automated production run.",
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
