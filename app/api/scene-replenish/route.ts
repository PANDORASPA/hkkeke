import { NextRequest, NextResponse } from "next/server";
import { formatAppSettingsError } from "@/lib/app-settings";
import { listDriveAssets, uploadAssetImage } from "@/lib/google-drive";
import { generateSceneVariation, makeSceneVariationFileName } from "@/lib/scene-generation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DriveAsset } from "@/lib/types";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      targetReserve?: number;
      variations?: number;
      seedSceneId?: string;
      extraPrompt?: string;
    };

    const assets = await listDriveAssets();
    const scenes = assets.filter((asset) => asset.category === "scene");
    if (!scenes.length) {
      return NextResponse.json(
        { ok: false, error: "場景補貨需要至少一張原始場景素材，請先放一張相入 Google Drive 場景資料夾。" },
        { status: 400 }
      );
    }

    const targetReserve = clamp(Number(body.targetReserve || process.env.AUTO_SCENE_RESERVE_TARGET || 24), 1, 500);
    const maxVariations = clamp(Number(body.variations || process.env.AUTO_SCENE_VARIATIONS_PER_RUN || 3), 1, 12);
    const needed = Math.max(0, targetReserve - scenes.length);
    const toCreate = Math.min(maxVariations, needed || maxVariations);
    const sourceScenes = selectSourceScenes(scenes, body.seedSceneId, toCreate);
    const uploadedAssets: DriveAsset[] = [];
    const warnings = new Set<string>();

    for (let index = 0; index < sourceScenes.length; index += 1) {
      const source = sourceScenes[index];
      const result = await generateSceneVariation({
        sceneAssetId: source.google_drive_file_id,
        sceneName: source.sub_category || source.file_name || "Scene",
        extraPrompt: [
          body.extraPrompt,
          `Scene reserve expansion ${index + 1}: keep it realistic, fresh, empty, and reusable for future model generation.`
        ].filter(Boolean).join("\n")
      });
      const asset = await uploadAssetImage(result.buffer, makeSceneVariationFileName(source), "scene", "image/png");
      uploadedAssets.push(asset);
    }

    if (uploadedAssets.length) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from("drive_assets").upsert(uploadedAssets, { onConflict: "google_drive_file_id" });
        if (error) throw error;
      } catch (error) {
        warnings.add(formatAppSettingsError(error));
      }
    }

    return NextResponse.json({
      ok: true,
      beforeCount: scenes.length,
      targetReserve,
      createdCount: uploadedAssets.length,
      afterEstimate: scenes.length + uploadedAssets.length,
      assets: uploadedAssets,
      warnings: Array.from(warnings)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "自動補充場景失敗。" },
      { status: 500 }
    );
  }
}

function selectSourceScenes(scenes: DriveAsset[], seedSceneId: string | undefined, count: number) {
  if (seedSceneId) {
    const exact = scenes.find((scene) => scene.id === seedSceneId || scene.google_drive_file_id === seedSceneId);
    if (exact) return Array.from({ length: count }, (_, index) => scenes[(scenes.indexOf(exact) + index) % scenes.length]);
  }
  const start = Math.floor(Date.now() / 60000) % scenes.length;
  return Array.from({ length: count }, (_, index) => scenes[(start + index) % scenes.length]);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
