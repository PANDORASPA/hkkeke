import { DRIVE_FOLDERS, readJsonFileFromDriveFolder, upsertJsonFileToDriveFolder } from "./google-drive";
import { GeneratedImage } from "./types";

const GENERATED_MANIFEST_FILE = "generated-images-manifest.json";
const MAX_MANIFEST_IMAGES = 1000;

type GeneratedManifest = {
  version: 1;
  updatedAt: string;
  images: GeneratedImage[];
};

function emptyManifest(): GeneratedManifest {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    images: []
  };
}

export async function readGeneratedDriveLog() {
  const rootFolderId = DRIVE_FOLDERS.root;
  if (!rootFolderId) return [];
  const manifest = await readJsonFileFromDriveFolder<GeneratedManifest>(rootFolderId, GENERATED_MANIFEST_FILE);
  return Array.isArray(manifest?.images) ? manifest.images : [];
}

export async function appendGeneratedDriveLog(images: GeneratedImage[]) {
  if (!images.length) return;
  const rootFolderId = DRIVE_FOLDERS.root;
  if (!rootFolderId) return;

  const current = await readJsonFileFromDriveFolder<GeneratedManifest>(rootFolderId, GENERATED_MANIFEST_FILE).catch(() => null);
  const byId = new Map<string, GeneratedImage>();

  for (const image of current?.images || []) {
    byId.set(stableImageKey(image), normalizeDriveLogImage(image));
  }
  for (const image of images) {
    byId.set(stableImageKey(image), normalizeDriveLogImage({ ...image, source: "drive" }));
  }

  const next: GeneratedManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    images: Array.from(byId.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_MANIFEST_IMAGES)
  };

  await upsertJsonFileToDriveFolder(rootFolderId, GENERATED_MANIFEST_FILE, next);
}

function stableImageKey(image: GeneratedImage) {
  return image.google_drive_file_id || image.id || image.google_drive_url || image.created_at;
}

function normalizeDriveLogImage(image: GeneratedImage): GeneratedImage {
  return {
    ...image,
    id: image.id || image.google_drive_file_id || `drive-${Date.now()}`,
    google_drive_file_id: image.google_drive_file_id || null,
    google_drive_url: image.google_drive_url || null,
    thumbnail_url: image.thumbnail_url || null,
    prompt: image.prompt || null,
    negative_prompt: image.negative_prompt || null,
    scene_asset_id: image.scene_asset_id || null,
    girl_reference_asset_id: image.girl_reference_asset_id || null,
    outfit_asset_id: image.outfit_asset_id || null,
    hair_asset_id: image.hair_asset_id || null,
    pose_asset_id: image.pose_asset_id || null,
    girl_style: image.girl_style || null,
    hairstyle: image.hairstyle || null,
    hair_color: image.hair_color || null,
    outfit: image.outfit || null,
    expression: image.expression || null,
    body_type: image.body_type || null,
    pose: image.pose || null,
    created_at: image.created_at || new Date().toISOString(),
    source: "drive"
  };
}
