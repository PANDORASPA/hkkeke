import { JWT } from "google-auth-library";
import { AssetCategory, DriveAsset } from "./types";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  parents?: string[];
};

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export const DRIVE_FOLDERS: Record<AssetCategory | "generated" | "root", string | undefined> = {
  root: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  scene: process.env.GOOGLE_DRIVE_SCENES_FOLDER_ID,
  girl: process.env.GOOGLE_DRIVE_GIRLS_FOLDER_ID,
  outfit: process.env.GOOGLE_DRIVE_OUTFITS_FOLDER_ID,
  hair: process.env.GOOGLE_DRIVE_HAIR_FOLDER_ID,
  pose: process.env.GOOGLE_DRIVE_POSES_FOLDER_ID,
  generated: process.env.GOOGLE_DRIVE_GENERATED_FOLDER_ID
};

function getDriveAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Missing Google service account environment variables.");
  }

  return new JWT({
    email,
    key: privateKey,
    scopes: [DRIVE_SCOPE]
  });
}

export async function driveFetch<T>(url: string, init: RequestInit = {}) {
  const client = getDriveAuth();
  const token = await client.getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.token}`,
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google Drive API error ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await response.json()) as T;
  return (await response.arrayBuffer()) as T;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function listImagesInFolder(folderId: string) {
  const files: DriveFile[] = [];
  let pageToken = "";

  do {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`
    );
    const url =
      `https://www.googleapis.com/drive/v3/files?q=${query}` +
      `&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,parents)` +
      `&pageSize=100&supportsAllDrives=true` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const result = await driveFetch<{ nextPageToken?: string; files?: DriveFile[] }>(url);
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);

  return files;
}

async function listSubfolders(folderId: string) {
  const query = encodeURIComponent(
    `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`
  );
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${query}` +
    `&fields=files(id,name,mimeType,webViewLink)&pageSize=100&supportsAllDrives=true`;
  const result = await driveFetch<{ files?: DriveFile[] }>(url);
  return result.files || [];
}

export async function listDriveAssets() {
  const categories: AssetCategory[] = ["scene", "girl", "outfit", "hair", "pose"];
  const assets: DriveAsset[] = [];

  for (const category of categories) {
    const folderId = DRIVE_FOLDERS[category];
    if (!folderId) continue;

    const directFiles = await listImagesInFolder(folderId);
    assets.push(...directFiles.map((file) => toAsset(file, category, null)));

    const subfolders = await listSubfolders(folderId);
    for (const folder of subfolders) {
      const files = await listImagesInFolder(folder.id);
      assets.push(...files.map((file) => toAsset(file, category, folder.name)));
    }
  }

  return assets;
}

function toAsset(file: DriveFile, category: AssetCategory, subCategory: string | null): DriveAsset {
  return {
    id: file.id,
    google_drive_file_id: file.id,
    google_drive_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    thumbnail_url: file.thumbnailLink || null,
    file_name: file.name,
    mime_type: file.mimeType,
    category,
    sub_category: subCategory,
    tags: [category, subCategory].filter(Boolean) as string[]
  };
}

export async function downloadDriveFile(fileId: string) {
  const buffer = await driveFetch<ArrayBuffer>(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`
  );
  return Buffer.from(buffer);
}

export async function uploadImageToDriveFolder(buffer: Buffer, fileName: string, folderId: string, mimeType = "image/png") {
  const metadata = {
    name: fileName,
    mimeType,
    parents: [folderId]
  };

  const boundary = `codex_${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  const file = await driveFetch<DriveFile>(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,thumbnailLink,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  return {
    google_drive_file_id: file.id,
    google_drive_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    thumbnail_url: file.thumbnailLink || null,
    file_name: file.name,
    mime_type: file.mimeType
  };
}

export async function uploadGeneratedImage(buffer: Buffer, fileName: string) {
  const folderId = DRIVE_FOLDERS.generated;
  if (!folderId) throw new Error("Missing GOOGLE_DRIVE_GENERATED_FOLDER_ID.");
  return uploadImageToDriveFolder(buffer, fileName, folderId);
}

export async function uploadAssetImage(buffer: Buffer, fileName: string, category: AssetCategory, mimeType = "image/png") {
  const folderId = DRIVE_FOLDERS[category];
  if (!folderId) throw new Error(`Missing Google Drive folder id for ${category}.`);
  const uploaded = await uploadImageToDriveFolder(buffer, fileName, folderId, mimeType);
  return {
    id: uploaded.google_drive_file_id,
    google_drive_file_id: uploaded.google_drive_file_id,
    google_drive_url: uploaded.google_drive_url,
    thumbnail_url: uploaded.thumbnail_url,
    file_name: uploaded.file_name,
    mime_type: uploaded.mime_type,
    category,
    sub_category: "AI_Generated",
    tags: [category, "ai-generated"]
  } satisfies DriveAsset;
}

export function makeGeneratedFileName(input: {
  scene?: string | null;
  girlStyle: string;
  hairStyle: string;
  outfit: string;
}) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const clean = (value: string) => value.replace(/[^a-z0-9]+/gi, "");
  return `${date}_${time}_${clean(input.scene || "Scene")}_${clean(input.girlStyle)}_${clean(input.hairStyle)}_${clean(input.outfit)}.png`;
}

export function driveSearchByName(name: string) {
  return encodeURIComponent(`name = '${escapeDriveQuery(name)}' and trashed = false`);
}
