"use client";

import { useEffect, useState } from "react";
import { OPTION_LABELS } from "@/lib/options";
import { GeneratedImage } from "@/lib/types";

export default function GalleryPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState("正在讀取圖庫...");

  useEffect(() => {
    fetch("/api/generated")
      .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || "讀取圖庫失敗。");
        setImages(json.images || []);
        setStatus(`共有 ${json.images?.length || 0} 張生成紀錄。`);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "讀取圖庫失敗。"));
  }, []);

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>圖庫</h1>
          <p className="muted">這裡讀取 Supabase generated_images 紀錄；圖片檔案本身存放在 Google Drive。</p>
        </div>
        <a className="secondary-link" href="/generate">返回生成</a>
      </div>
      <p className="status">{status}</p>
      <section className="gallery-grid">
        {images.map((image) => (
          <article className="image-card" key={image.id}>
            {image.thumbnail_url ? <img src={image.thumbnail_url} alt={image.prompt || "生成圖片"} /> : <div className="image-placeholder">無預覽</div>}
            <div>
              <strong>{label(image.girl_style)} / {label(image.outfit)}</strong>
              <span className="clamp">{image.prompt}</span>
              <span>
                髮型：{label(image.hairstyle)} / {label(image.hair_color)}<br />
                表情：{label(image.expression)}<br />
                身材：{label(image.body_type)}<br />
                姿勢：{label(image.pose)}<br />
                建立時間：{new Date(image.created_at).toLocaleString("zh-HK")}
              </span>
              <div className="card-actions">
                {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive</a> : null}
                <a href={`/api/generated/${image.id}/download`}>下載 PNG</a>
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
