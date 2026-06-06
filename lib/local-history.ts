"use client";

import { AssetCategory, DriveAsset, GeneratedImage, GeneratePayload } from "./types";

const DB_NAME = "ai-girl-generator";
const DB_VERSION = 3;
const IMAGE_STORE = "images";
const BATCH_STORE = "batches";
const ASSET_STORE = "assets";
const QUEUE_STORE = "queue";

export type LocalBatch = {
  id: string;
  created_at: string;
  payload: GeneratePayload;
  assets: DriveAsset[];
  image_ids: string[];
};

export type LocalGeneratedImage = GeneratedImage & {
  batch_id: string;
  local_status: "new" | "selected" | "rejected";
  source: "local";
};

export type LocalAsset = DriveAsset & {
  id: string;
  data_url: string;
  source: "local";
  created_at: string;
};

export type LocalQueueJob = {
  id: string;
  label: string;
  payload: GeneratePayload;
  assets: DriveAsset[];
  status: "pending" | "running" | "done" | "failed";
  message: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  attempts?: number;
  maxAttempts?: number;
  lastError?: string;
  results?: GeneratedImage[];
};

export type LocalManifest = {
  version?: number;
  exported_at?: string;
  batches?: LocalBatch[];
  assets?: LocalAsset[];
  queue?: LocalQueueJob[];
  images?: LocalGeneratedImage[];
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        const images = db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
        images.createIndex("created_at", "created_at");
        images.createIndex("batch_id", "batch_id");
        images.createIndex("local_status", "local_status");
      }
      if (!db.objectStoreNames.contains(BATCH_STORE)) {
        db.createObjectStore(BATCH_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const assets = db.createObjectStore(ASSET_STORE, { keyPath: "id" });
        assets.createIndex("category", "category");
        assets.createIndex("created_at", "created_at");
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        queue.createIndex("createdAt", "createdAt");
        queue.createIndex("status", "status");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB 開啟失敗。"));
  });
}

function storePut<T>(store: IDBObjectStore, value: T) {
  return new Promise<void>((resolve, reject) => {
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("IndexedDB 寫入失敗。"));
  });
}

function storeGetAll<T>(store: IDBObjectStore) {
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error || new Error("IndexedDB 讀取失敗。"));
  });
}

export async function saveGeneratedBatch(input: {
  images: GeneratedImage[];
  payload: GeneratePayload;
  assets: DriveAsset[];
}) {
  const db = await openDb();
  const batchId = `batch-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const localImages: LocalGeneratedImage[] = input.images.map((image, index) => ({
    ...image,
    id: image.id || `${batchId}-${index}`,
    batch_id: batchId,
    local_status: "new",
    source: "local"
  }));
  const batch: LocalBatch = {
    id: batchId,
    created_at: createdAt,
    payload: input.payload,
    assets: input.assets,
    image_ids: localImages.map((image) => image.id)
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([IMAGE_STORE, BATCH_STORE], "readwrite");
    const imageStore = tx.objectStore(IMAGE_STORE);
    const batchStore = tx.objectStore(BATCH_STORE);
    for (const image of localImages) imageStore.put(image);
    batchStore.put(batch);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("保存本地歷史失敗。"));
  });

  db.close();
  return localImages;
}

export async function loadLocalImages() {
  const db = await openDb();
  const tx = db.transaction(IMAGE_STORE, "readonly");
  const images = await storeGetAll<LocalGeneratedImage>(tx.objectStore(IMAGE_STORE));
  db.close();
  return images.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function loadLocalBatches() {
  const db = await openDb();
  const tx = db.transaction(BATCH_STORE, "readonly");
  const batches = await storeGetAll<LocalBatch>(tx.objectStore(BATCH_STORE));
  db.close();
  return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateLocalImageStatus(id: string, status: LocalGeneratedImage["local_status"]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const image = request.result as LocalGeneratedImage | undefined;
      if (image) store.put({ ...image, local_status: status });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("更新本地狀態失敗。"));
  });
  db.close();
}

export async function updateLocalImagesStatus(ids: string[], status: LocalGeneratedImage["local_status"]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    for (const id of ids) {
      const request = store.get(id);
      request.onsuccess = () => {
        const image = request.result as LocalGeneratedImage | undefined;
        if (image) store.put({ ...image, local_status: status });
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("批量更新本地狀態失敗。"));
  });
  db.close();
}

export async function deleteLocalImage(id: string) {
  await deleteLocalImages([id]);
}

export async function deleteLocalImages(ids: string[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([IMAGE_STORE, BATCH_STORE], "readwrite");
    const imageStore = tx.objectStore(IMAGE_STORE);
    const batchStore = tx.objectStore(BATCH_STORE);
    for (const id of ids) imageStore.delete(id);
    const batchRequest = batchStore.getAll();
    batchRequest.onsuccess = () => {
      const batches = batchRequest.result as LocalBatch[];
      for (const batch of batches) {
        if (batch.image_ids.some((id) => ids.includes(id))) {
          batchStore.put({ ...batch, image_ids: batch.image_ids.filter((imageId) => !ids.includes(imageId)) });
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("刪除本地圖片失敗。"));
  });
  db.close();
}

export async function buildLocalManifest() {
  const db = await openDb();
  const tx = db.transaction([IMAGE_STORE, BATCH_STORE, ASSET_STORE, QUEUE_STORE], "readonly");
  const images = await storeGetAll<LocalGeneratedImage>(tx.objectStore(IMAGE_STORE));
  const batches = await storeGetAll<LocalBatch>(tx.objectStore(BATCH_STORE));
  const assets = await storeGetAll<LocalAsset>(tx.objectStore(ASSET_STORE));
  const queue = await storeGetAll<LocalQueueJob>(tx.objectStore(QUEUE_STORE));
  db.close();
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    batches,
    assets,
    queue,
    images
  };
}

export async function importLocalManifest(manifest: LocalManifest) {
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const images = Array.isArray(manifest.images) ? manifest.images : [];
  const batches = Array.isArray(manifest.batches) ? manifest.batches : [];
  const queue = Array.isArray(manifest.queue) ? manifest.queue : [];

  if (!assets.length && !images.length && !batches.length && !queue.length) {
    throw new Error("這個 JSON 沒有可匯入的素材、圖片、批次或列隊資料。");
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([IMAGE_STORE, BATCH_STORE, ASSET_STORE, QUEUE_STORE], "readwrite");
    const imageStore = tx.objectStore(IMAGE_STORE);
    const batchStore = tx.objectStore(BATCH_STORE);
    const assetStore = tx.objectStore(ASSET_STORE);
    const queueStore = tx.objectStore(QUEUE_STORE);

    for (const asset of assets) assetStore.put(normalizeAsset(asset));
    for (const image of images) imageStore.put(normalizeImage(image));
    for (const batch of batches) batchStore.put(batch);
    for (const job of queue) queueStore.put(normalizeQueueJob(job));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("匯入素材包失敗。"));
  });
  db.close();

  return {
    assets: assets.length,
    images: images.length,
    batches: batches.length,
    queue: queue.length
  };
}

export async function saveLocalAsset(input: {
  file: File;
  category: AssetCategory;
  subCategory?: string;
}) {
  const dataUrl = await fileToDataUrl(input.file);
  const asset: LocalAsset = {
    id: `local-asset-${input.category}-${Date.now()}-${crypto.randomUUID()}`,
    google_drive_file_id: "",
    google_drive_url: null,
    thumbnail_url: dataUrl,
    data_url: dataUrl,
    file_name: input.file.name,
    mime_type: input.file.type || "image/png",
    category: input.category,
    sub_category: input.subCategory || "本地素材",
    tags: [input.category, "local"],
    created_at: new Date().toISOString(),
    source: "local"
  };

  const db = await openDb();
  const tx = db.transaction(ASSET_STORE, "readwrite");
  await storePut(tx.objectStore(ASSET_STORE), asset);
  db.close();
  return asset;
}

export async function loadLocalAssets() {
  const db = await openDb();
  const tx = db.transaction(ASSET_STORE, "readonly");
  const assets = await storeGetAll<LocalAsset>(tx.objectStore(ASSET_STORE));
  db.close();
  return assets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deleteLocalAsset(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ASSET_STORE, "readwrite");
    tx.objectStore(ASSET_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("刪除本地素材失敗。"));
  });
  db.close();
}

export async function saveLocalQueue(jobs: LocalQueueJob[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    store.clear();
    for (const job of jobs) store.put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("保存列隊失敗。"));
  });
  db.close();
}

export async function loadLocalQueue() {
  const db = await openDb();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const jobs = await storeGetAll<LocalQueueJob>(tx.objectStore(QUEUE_STORE));
  db.close();
  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function normalizeAsset(asset: LocalAsset): LocalAsset {
  const createdAt = asset.created_at || new Date().toISOString();
  return {
    ...asset,
    id: asset.id || `imported-asset-${Date.now()}-${crypto.randomUUID()}`,
    google_drive_file_id: asset.google_drive_file_id || "",
    google_drive_url: asset.google_drive_url || null,
    thumbnail_url: asset.thumbnail_url || asset.data_url || null,
    data_url: asset.data_url || asset.thumbnail_url || "",
    file_name: asset.file_name || "imported-asset.png",
    mime_type: asset.mime_type || "image/png",
    sub_category: asset.sub_category || "匯入素材",
    tags: asset.tags || ["local"],
    created_at: createdAt,
    source: "local"
  };
}

function normalizeImage(image: LocalGeneratedImage): LocalGeneratedImage {
  return {
    ...image,
    id: image.id || `imported-image-${Date.now()}-${crypto.randomUUID()}`,
    batch_id: image.batch_id || "imported",
    local_status: image.local_status || "new",
    source: "local",
    created_at: image.created_at || new Date().toISOString()
  };
}

function normalizeQueueJob(job: LocalQueueJob): LocalQueueJob {
  const attempts = Number.isFinite(job.attempts) ? Number(job.attempts) : 0;
  const maxAttempts = Number.isFinite(job.maxAttempts) ? Number(job.maxAttempts) : 3;
  return {
    ...job,
    id: job.id || `imported-job-${Date.now()}-${crypto.randomUUID()}`,
    status: job.status === "running" ? "failed" : job.status || "pending",
    message: job.status === "running" ? "匯入時任務未完成，請按重試。" : job.message || "等待生成",
    createdAt: job.createdAt || new Date().toISOString(),
    attempts,
    maxAttempts: Math.max(1, maxAttempts),
    lastError: job.lastError || ""
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("讀取圖片失敗。"));
    reader.readAsDataURL(file);
  });
}

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
