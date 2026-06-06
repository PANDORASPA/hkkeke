"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildLocalManifest,
  deleteLocalImage,
  deleteLocalImages,
  downloadJson,
  loadLocalBatches,
  loadLocalImages,
  LocalBatch,
  updateLocalImageStatus,
  updateLocalImagesStatus
} from "@/lib/local-history";
import { OPTION_LABELS } from "@/lib/options";
import { GeneratedImage } from "@/lib/types";

type GalleryFilter = "all" | "selected" | "rejected" | "new";
type SourceFilter = "all" | "local" | "supabase";

export default function GalleryPage() {
  const [remoteImages, setRemoteImages] = useState<GeneratedImage[]>([]);
  const [localImages, setLocalImages] = useState<GeneratedImage[]>([]);
  const [localBatches, setLocalBatches] = useState<LocalBatch[]>([]);
  const [status, setStatus] = useState("正在讀取圖庫...");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    refreshGallery();
  }, []);

  async function refreshGallery() {
    const messages: string[] = [];

    try {
      const local = await loadLocalImages();
      const batches = await loadLocalBatches();
      setLocalImages(local);
      setLocalBatches(batches);
      messages.push(`本地歷史 ${local.length} 張 / 批次 ${batches.length}`);
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
    setStatus("已刪除本機圖片。");
  }

  async function copyPrompt(prompt?: string | null) {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyMessage("已複製 prompt。");
    } catch {
      setCopyMessage("複製失敗，請手動複製。");
    }
    window.setTimeout(() => setCopyMessage(""), 1800);
  }

  async function exportManifest() {
    const manifest = await buildLocalManifest();
    downloadJson(manifest, `ai-girl-generator_${new Date().toISOString().slice(0, 10)}.json`);
  }

  function exportBatch(batch: LocalBatch) {
    const batchImages = localImages.filter((image) => batch.image_ids.includes(image.id));
    downloadJson({
      version: 1,
      exported_at: new Date().toISOString(),
      batches: [batch],
      images: batchImages,
      assets: batch.assets,
      queue: []
    }, `${batch.id}_${new Date(batch.created_at).toISOString().slice(0, 10)}.json`);
  }

  const mergedImages = useMemo(() => {
    const localIds = new Set(localImages.map((image) => image.id));
    return [
      ...localImages,
      ...remoteImages.filter((image) => !localIds.has(image.id))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [localImages, remoteImages]);

  const images = useMemo(() => {
    return mergedImages
      .filter((image) => filter === "all" || (image.local_status || "new") === filter)
      .filter((image) => sourceFilter === "all" || image.source === sourceFilter)
      .filter((image) => !todayOnly || isToday(image.created_at))
      .filter((image) => matchesSearch(image, search));
  }, [filter, mergedImages, search, sourceFilter, todayOnly]);

  const visibleLocalIds = useMemo(
    () => images.filter((image) => image.source === "local").map((image) => image.id),
    [images]
  );

  const batchReports = useMemo(() => {
    return localBatches.map((batch) => {
      const batchImages = localImages.filter((image) => batch.image_ids.includes(image.id));
      const selected = batchImages.filter((image) => image.local_status === "selected").length;
      const rejected = batchImages.filter((image) => image.local_status === "rejected").length;
      const fresh = batchImages.filter((image) => (image.local_status || "new") === "new").length;
      return {
        batch,
        images: batchImages,
        selected,
        rejected,
        fresh,
        missing: Math.max(0, batch.image_ids.length - batchImages.length)
      };
    }).filter((report) => report.images.length || report.missing);
  }, [localBatches, localImages]);

  const stats = useMemo(() => {
    return {
      total: mergedImages.length,
      visible: images.length,
      local: mergedImages.filter((image) => image.source === "local").length,
      supabase: mergedImages.filter((image) => image.source === "supabase").length,
      new: mergedImages.filter((image) => (image.local_status || "new") === "new").length,
      selected: mergedImages.filter((image) => image.local_status === "selected").length,
      rejected: mergedImages.filter((image) => image.local_status === "rejected").length
    };
  }, [images.length, mergedImages]);

  async function bulkMarkVisible(nextStatus: "selected" | "rejected" | "new") {
    if (!visibleLocalIds.length) return;
    await updateLocalImagesStatus(visibleLocalIds, nextStatus);
    setLocalImages((current) =>
      current.map((image) => visibleLocalIds.includes(image.id) ? { ...image, local_status: nextStatus } : image)
    );
    setStatus(`已批量標記 ${visibleLocalIds.length} 張本機圖片為「${statusLabel(nextStatus)}」。`);
  }

  async function bulkDeleteVisible() {
    if (!visibleLocalIds.length) return;
    const ok = window.confirm(`確定刪除目前可見的 ${visibleLocalIds.length} 張本機圖片？這只會刪除本機歷史，不會刪 Google Drive。`);
    if (!ok) return;
    await deleteLocalImages(visibleLocalIds);
    setLocalImages((current) => current.filter((image) => !visibleLocalIds.includes(image.id)));
    setStatus(`已刪除 ${visibleLocalIds.length} 張可見本機圖片。`);
  }

  function focusBatch(batchId: string) {
    setSourceFilter("local");
    setFilter("all");
    setTodayOnly(false);
    setSearch(batchId);
    setStatus(`已篩選批次：${batchId}`);
  }

  async function markBatch(batch: LocalBatch, nextStatus: "selected" | "rejected" | "new") {
    const ids = localImages.filter((image) => batch.image_ids.includes(image.id)).map((image) => image.id);
    if (!ids.length) return;
    await updateLocalImagesStatus(ids, nextStatus);
    setLocalImages((current) =>
      current.map((image) => ids.includes(image.id) ? { ...image, local_status: nextStatus } : image)
    );
    setStatus(`已把批次 ${shortId(batch.id)} 的 ${ids.length} 張圖片標記為「${statusLabel(nextStatus)}」。`);
  }

  async function deleteBatchImages(batch: LocalBatch) {
    const ids = localImages.filter((image) => batch.image_ids.includes(image.id)).map((image) => image.id);
    if (!ids.length) return;
    const ok = window.confirm(`確定刪除批次 ${shortId(batch.id)} 的 ${ids.length} 張本機圖片？這不會刪 Google Drive。`);
    if (!ok) return;
    await deleteLocalImages(ids);
    setLocalImages((current) => current.filter((image) => !ids.includes(image.id)));
    setStatus(`已刪除批次 ${shortId(batch.id)} 的 ${ids.length} 張本機圖片。`);
  }

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>圖庫</h1>
          <p className="muted">
            這裡合併 Supabase 記錄同本機瀏覽器歷史。大量生成後，可以先搜尋、只看今日、批量保留或批量標記唔要。
          </p>
        </div>
        <div className="toolbar">
          <button onClick={refreshGallery}>重新整理</button>
          <button onClick={exportManifest}>匯出素材包 JSON</button>
          <a className="secondary-link" href="/generate">返回生成</a>
        </div>
      </div>

      <p className="status">{status}{copyMessage ? ` / ${copyMessage}` : ""}</p>

      <section className="gallery-tools">
        <label>
          搜尋
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜尋 prompt / 衣服 / 髮型 / 表情"
          />
        </label>
        <label>
          來源
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}>
            <option value="all">全部來源</option>
            <option value="local">本機</option>
            <option value="supabase">Supabase</option>
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={todayOnly} onChange={(event) => setTodayOnly(event.target.checked)} />
          只看今日
        </label>
      </section>

      <section className="gallery-stats">
        <span>全部 {stats.total}</span>
        <span>目前顯示 {stats.visible}</span>
        <span>本機 {stats.local}</span>
        <span>Supabase {stats.supabase}</span>
        <span>新生成 {stats.new}</span>
        <span>已保留 {stats.selected}</span>
        <span>唔要 {stats.rejected}</span>
      </section>

      <section className="batch-panel">
        <div className="batch-panel-heading">
          <div>
            <strong>批次報表</strong>
            <p className="muted">每次生成會保存成一個批次；大量生產後可用批次快速追蹤、標記和匯出。</p>
          </div>
          <span>{batchReports.length} 個批次</span>
        </div>
        {!batchReports.length ? (
          <div className="empty-state">
            <strong>未有本機批次</strong>
            <span>生成或匯入素材包後，批次會顯示在這裡。</span>
          </div>
        ) : (
          <div className="batch-list">
            {batchReports.slice(0, 12).map((report) => (
              <article className="batch-item" key={report.batch.id}>
                <div>
                  <strong>{shortId(report.batch.id)} / {new Date(report.batch.created_at).toLocaleString("zh-HK")}</strong>
                  <span>
                    圖片 {report.images.length}
                    {report.missing ? ` / 缺少 ${report.missing}` : ""}
                    {" "} / 新生成 {report.fresh} / 已保留 {report.selected} / 唔要 {report.rejected}
                  </span>
                  <span>
                    {label(report.batch.payload.girlStyle)} / {label(report.batch.payload.outfit)} / {label(report.batch.payload.hairStyle)} / {label(report.batch.payload.pose)}
                  </span>
                </div>
                <div className="queue-actions">
                  <button type="button" onClick={() => focusBatch(report.batch.id)}>查看批次</button>
                  <button type="button" onClick={() => markBatch(report.batch, "selected")}>整批保留</button>
                  <button type="button" onClick={() => markBatch(report.batch, "rejected")}>整批唔要</button>
                  <button type="button" onClick={() => exportBatch(report.batch)}>匯出批次</button>
                  <button type="button" onClick={() => deleteBatchImages(report.batch)}>刪除批次圖片</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="filter-row">
        <button className={filter === "all" ? "primary" : ""} onClick={() => setFilter("all")}>全部</button>
        <button className={filter === "new" ? "primary" : ""} onClick={() => setFilter("new")}>新生成</button>
        <button className={filter === "selected" ? "primary" : ""} onClick={() => setFilter("selected")}>保留</button>
        <button className={filter === "rejected" ? "primary" : ""} onClick={() => setFilter("rejected")}>唔要</button>
      </div>

      <div className="bulk-panel">
        <span>目前可批量處理 {visibleLocalIds.length} 張本機圖片。</span>
        <div className="card-actions">
          <button type="button" disabled={!visibleLocalIds.length} onClick={() => bulkMarkVisible("selected")}>批量保留可見</button>
          <button type="button" disabled={!visibleLocalIds.length} onClick={() => bulkMarkVisible("rejected")}>批量唔要可見</button>
          <button type="button" disabled={!visibleLocalIds.length} onClick={() => bulkMarkVisible("new")}>批量還原可見</button>
          <button type="button" disabled={!visibleLocalIds.length} onClick={bulkDeleteVisible}>刪除可見本機圖片</button>
        </div>
      </div>

      {!images.length ? (
        <div className="empty-state">
          <strong>未有符合條件的圖片</strong>
          <span>可以清除搜尋或篩選；如果未生成過圖片，請到「生成圖片」頁建立列隊。</span>
        </div>
      ) : null}

      <section className="gallery-grid">
        {images.map((image) => (
          <article className="image-card" key={image.id}>
            {image.data_url || image.thumbnail_url ? (
              <img src={image.data_url || image.thumbnail_url || ""} alt="生成圖片" />
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

function shortId(value: string) {
  return value.replace("batch-", "#");
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function matchesSearch(image: GeneratedImage, search: string) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;
  return [
    image.file_name,
    image.batch_id,
    image.prompt,
    image.girl_style,
    image.hairstyle,
    image.hair_color,
    image.outfit,
    image.expression,
    image.body_type,
    image.pose
  ].some((value) => String(value || "").toLowerCase().includes(keyword));
}
