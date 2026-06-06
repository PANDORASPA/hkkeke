"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildLocalManifest,
  deleteLocalImage,
  downloadJson,
  loadLocalImages,
  updateLocalImageStatus
} from "@/lib/local-history";
import { OPTION_LABELS } from "@/lib/options";
import { GeneratedImage } from "@/lib/types";

type GalleryFilter = "all" | "selected" | "rejected" | "new";

export default function GalleryPage() {
  const [remoteImages, setRemoteImages] = useState<GeneratedImage[]>([]);
  const [localImages, setLocalImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState("正在讀取圖庫...");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    refreshGallery();
  }, []);

  async function refreshGallery() {
    const messages: string[] = [];

    try {
      const local = await loadLocalImages();
      setLocalImages(local);
      messages.push(`本地歷史 ${local.length} 張`);
    } catch (error) {
      messages.push(error instanceof Error ? error.message : "本地歷史讀取失敗。");
    }

    try {
      const response = await fetch("/api/generated");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Supabase 圖庫讀取失敗。");
      const images = (json.images || []).map((image: GeneratedImage) => ({ ...image, source: "supabase" as const }));
      setRemoteImages(images);
      messages.push(`Supabase ${images.length} 張`);
    } catch (error) {
      messages.push(error instanceof Error ? `Supabase：${error.message}` : "Supabase 圖庫讀取失敗。");
    }

    setStatus(messages.join(" / "));
  }

  async function markImage(id: string, nextStatus: "selected" | "rejected" | "new") {
    await updateLocalImageStatus(id, nextStatus);
    setLocalImages((current) =>
      current.map((image) => image.id === id ? { ...image, local_status: nextStatus } : image)
    );
  }

  async function removeImage(id: string) {
    await deleteLocalImage(id);
    setLocalImages((current) => current.filter((image) => image.id !== id));
    setStatus("已刪除本地圖片。");
  }

  async function copyPrompt(prompt?: string | null) {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopyMessage("已複製 prompt。");
    window.setTimeout(() => setCopyMessage(""), 1800);
  }

  async function exportManifest() {
    const manifest = await buildLocalManifest();
    downloadJson(manifest, `ai-girl-generator_${new Date().toISOString().slice(0, 10)}.json`);
  }

  const images = useMemo(() => {
    const localIds = new Set(localImages.map((image) => image.id));
    const merged = [
      ...localImages,
      ...remoteImages.filter((image) => !localIds.has(image.id))
    ];
    return merged
      .filter((image) => filter === "all" || (image.local_status || "new") === filter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filter, localImages, remoteImages]);

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>圖庫</h1>
          <p className="muted">
            這裡會合併 Supabase 記錄同本機瀏覽器歷史；就算 Supabase 暫停，本機生成過的圖片仍然可以下載和整理。
          </p>
        </div>
        <div className="toolbar">
          <button onClick={refreshGallery}>重新整理</button>
          <button onClick={exportManifest}>匯出素材包 JSON</button>
          <a className="secondary-link" href="/generate">返回生成</a>
        </div>
      </div>

      <p className="status">{status}{copyMessage ? ` / ${copyMessage}` : ""}</p>

      <div className="filter-row">
        <button className={filter === "all" ? "primary" : ""} onClick={() => setFilter("all")}>全部</button>
        <button className={filter === "new" ? "primary" : ""} onClick={() => setFilter("new")}>新生成</button>
        <button className={filter === "selected" ? "primary" : ""} onClick={() => setFilter("selected")}>保留</button>
        <button className={filter === "rejected" ? "primary" : ""} onClick={() => setFilter("rejected")}>唔要</button>
      </div>

      {!images.length ? (
        <div className="empty-state">
          <strong>未有圖片</strong>
          <span>到「生成圖片」頁選場景並生成，完成後會自動出現在這裡。</span>
        </div>
      ) : null}

      <section className="gallery-grid">
        {images.map((image) => (
          <article className="image-card" key={image.id}>
            {image.data_url || image.thumbnail_url ? (
              <img src={image.data_url || image.thumbnail_url || ""} alt={image.prompt || "生成圖片"} />
            ) : (
              <div className="image-placeholder">無預覽</div>
            )}
            <div>
              <strong>{label(image.girl_style)} / {label(image.outfit)}</strong>
              <span>狀態：{statusLabel(image.local_status || "new")} / 來源：{sourceLabel(image.source)}</span>
              {image.upload_warning ? <span className="error-text">{image.upload_warning}</span> : null}
              <span className="clamp">{image.prompt}</span>
              <span>
                髮型：{label(image.hairstyle)} / {label(image.hair_color)}<br />
                表情：{label(image.expression)}<br />
                身材：{label(image.body_type)}<br />
                姿勢：{label(image.pose)}<br />
                建立時間：{new Date(image.created_at).toLocaleString("zh-HK")}
              </span>
              <div className="card-actions">
                {image.source === "local" ? (
                  <>
                    <button type="button" onClick={() => markImage(image.id, "selected")}>保留</button>
                    <button type="button" onClick={() => markImage(image.id, "rejected")}>唔要</button>
                    <button type="button" onClick={() => markImage(image.id, "new")}>還原</button>
                    <button type="button" onClick={() => removeImage(image.id)}>刪除</button>
                  </>
                ) : null}
                <button type="button" onClick={() => copyPrompt(image.prompt)}>複製 prompt</button>
                {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive</a> : null}
                {image.data_url ? (
                  <a href={image.data_url} download={image.file_name || "generated.png"}>下載 PNG</a>
                ) : (
                  <a href={`/api/generated/${image.id}/download`}>下載 PNG</a>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function label(value?: string | null) {
  return value ? OPTION_LABELS[value] || value : "未設定";
}

function statusLabel(value: string) {
  if (value === "selected") return "已保留";
  if (value === "rejected") return "唔要";
  return "新生成";
}

function sourceLabel(value?: string | null) {
  if (value === "local") return "本機";
  if (value === "supabase") return "Supabase";
  return "Supabase";
}
