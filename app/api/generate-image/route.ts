import { NextRequest, NextResponse } from "next/server";
import { buildPrompt, getNegativePrompt } from "@/lib/prompt";
import { GeneratePayload } from "@/lib/types";
import { downloadDriveFile, makeGeneratedFileName, uploadGeneratedImage } from "@/lib/google-drive";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as GeneratePayload;
    validatePayload(payload);

    const supabase = getSupabaseAdmin();
    const { data: sceneAsset, error: sceneError } = await supabase
      .from("drive_assets")
      .select("*")
      .eq("id", payload.sceneAssetId)
      .single();
    if (sceneError) throw sceneError;

    const optionalAssetIds = [
      payload.girlReferenceAssetId,
      payload.outfitAssetId,
      payload.hairAssetId,
      payload.poseAssetId
    ].filter(Boolean) as string[];
    const optionalAssets = optionalAssetIds.length
      ? await supabase.from("drive_assets").select("*").in("id", optionalAssetIds)
      : { data: [], error: null };
    if (optionalAssets.error) throw optionalAssets.error;

    const prompt = buildPrompt(payload);
    const negativePrompt = getNegativePrompt();
    const references = [sceneAsset, ...(optionalAssets.data || [])];
    const results = [];

    for (let index = 0; index < payload.count; index += 1) {
      const imageBuffer = await generateImageWithOpenAI(prompt, references);
      const fileName = makeGeneratedFileName({
        scene: sceneAsset.sub_category || sceneAsset.file_name,
        girlStyle: payload.girlStyle,
        hairStyle: payload.hairStyle,
        outfit: payload.outfit
      });
      const uploaded = await uploadGeneratedImage(imageBuffer, fileName);

      const record = {
        google_drive_file_id: uploaded.google_drive_file_id,
        google_drive_url: uploaded.google_drive_url,
        thumbnail_url: uploaded.thumbnail_url,
        prompt,
        negative_prompt: negativePrompt,
        scene_asset_id: payload.sceneAssetId,
        girl_reference_asset_id: payload.girlReferenceAssetId || null,
        outfit_asset_id: payload.outfitAssetId || null,
        hair_asset_id: payload.hairAssetId || null,
        pose_asset_id: payload.poseAssetId || null,
        girl_style: payload.girlStyle,
        hairstyle: payload.hairStyle,
        hair_color: payload.hairColor,
        outfit: payload.outfit,
        expression: payload.expression,
        body_type: payload.bodyType,
        pose: payload.pose
      };

      const { data, error } = await supabase.from("generated_images").insert(record).select("*").single();
      if (error) throw error;
      results.push(data);
    }

    return NextResponse.json({ images: results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

function validatePayload(payload: GeneratePayload) {
  if (!payload.sceneAssetId) throw new Error("sceneAssetId is required.");
  if (![1, 2, 4].includes(payload.count)) throw new Error("count must be 1, 2, or 4.");
}

async function generateImageWithOpenAI(prompt: string, references: Array<{ google_drive_file_id: string; file_name?: string | null; mime_type?: string | null }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");

  const formData = new FormData();
  formData.append("model", "gpt-image-1.5");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "1024x1024");
  formData.append("quality", "medium");
  formData.append("output_format", "png");

  for (const asset of references) {
    const buffer = await downloadDriveFile(asset.google_drive_file_id);
    const blob = new Blob([buffer], { type: asset.mime_type || "image/png" });
    formData.append("image", blob, asset.file_name || `${asset.google_drive_file_id}.png`);
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error?.message || `OpenAI image generation failed with ${response.status}.`);
  }

  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI response did not include b64_json.");
  return Buffer.from(b64, "base64");
}
