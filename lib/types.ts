export type AssetCategory = "scene" | "girl" | "outfit" | "hair" | "pose";

export type DriveAsset = {
  id?: string;
  google_drive_file_id: string;
  google_drive_url: string | null;
  thumbnail_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  category: AssetCategory | string;
  sub_category: string | null;
  tags?: string[] | null;
  created_at?: string;
};

export type GeneratedImage = {
  id: string;
  google_drive_file_id: string | null;
  google_drive_url: string | null;
  thumbnail_url: string | null;
  prompt: string | null;
  negative_prompt: string | null;
  scene_asset_id: string | null;
  girl_reference_asset_id: string | null;
  outfit_asset_id: string | null;
  hair_asset_id: string | null;
  pose_asset_id: string | null;
  girl_style: string | null;
  hairstyle: string | null;
  hair_color: string | null;
  outfit: string | null;
  expression: string | null;
  body_type: string | null;
  pose: string | null;
  created_at: string;
};

export type GeneratePayload = {
  sceneAssetId: string;
  girlReferenceAssetId?: string;
  outfitAssetId?: string;
  hairAssetId?: string;
  poseAssetId?: string;
  girlStyle: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  bodyType: string;
  expression: string;
  pose: string;
  extraPrompt?: string;
  count: 1 | 2 | 4;
};

export type GenerateResult = {
  images: GeneratedImage[];
};
