import { decryptSecret, encryptSecret } from "./secret-crypto";
import { DRIVE_FOLDERS, readJsonFileFromDriveFolder, upsertJsonFileToDriveFolder } from "./google-drive";

const SETTINGS_FILE_NAME = "ai-girl-generator-settings.json";

type DriveSettingsFile = {
  version: 1;
  updatedAt: string;
  encrypted: Record<string, string>;
};

function emptySettings(): DriveSettingsFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    encrypted: {}
  };
}

export async function getDriveAppSetting(key: string) {
  const rootFolderId = DRIVE_FOLDERS.root;
  if (!rootFolderId) return null;
  const settings = await readJsonFileFromDriveFolder<DriveSettingsFile>(rootFolderId, SETTINGS_FILE_NAME);
  const encrypted = settings?.encrypted?.[key];
  return encrypted ? decryptSecret(encrypted) || null : null;
}

export async function setDriveAppSetting(key: string, value: string) {
  const rootFolderId = DRIVE_FOLDERS.root;
  if (!rootFolderId) throw new Error("未設定 Google Drive root folder id，不能保存 Drive 設定檔。");
  const current = await readJsonFileFromDriveFolder<DriveSettingsFile>(rootFolderId, SETTINGS_FILE_NAME).catch(() => null);
  const next: DriveSettingsFile = {
    ...(current || emptySettings()),
    version: 1,
    updatedAt: new Date().toISOString(),
    encrypted: {
      ...(current?.encrypted || {}),
      [key]: encryptSecret(value)
    }
  };
  await upsertJsonFileToDriveFolder(rootFolderId, SETTINGS_FILE_NAME, next);
}
