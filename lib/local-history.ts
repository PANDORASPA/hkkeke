"use client";

import { DriveAsset, GeneratedImage, GeneratePayload } from "./types";

const DB_NAME = "ai-girl-generator";
const DB_VERSION = 1;
const IMAGE_STORE = "images";
const BATCH_STORE = "batches";

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

function storeGet<T>(store: IDBObjectStore, key: IDBValidKey) {
  return new Promise<T | undefined>((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
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

export async function buildLocalManifest() {
  const db = await openDb();
  const tx = db.transaction([IMAGE_STORE, BATCH_STORE], "readonly");
  const images = await storeGetAll<LocalGeneratedImage>(tx.objectStore(IMAGE_STORE));
  const batches = await storeGetAll<LocalBatch>(tx.objectStore(BATCH_STORE));
  db.close();
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    batches,
    images
  };
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
