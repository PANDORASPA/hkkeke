"use client";

import { useEffect, useState } from "react";
import { GeneratedImage } from "@/lib/types";

export default function GalleryPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState("Loading gallery...");

  useEffect(() => {
    fetch("/api/generated")
      .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || "Failed to load gallery.");
        setImages(json.images || []);
        setStatus(`${json.images?.length || 0} generated images.`);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Failed to load gallery."));
  }, []);

  return (
    <main className="page">
      <h1>Gallery</h1>
      <p className="status">{status}</p>
      <section className="gallery-grid">
        {images.map((image) => (
          <article className="image-card" key={image.id}>
            {image.thumbnail_url ? <img src={image.thumbnail_url} alt={image.prompt || "Generated image"} /> : null}
            <div>
              <strong>{image.girl_style} / {image.outfit}</strong>
              <span>{image.prompt}</span>
              <span>
                Hair: {image.hairstyle} / {image.hair_color}<br />
                Expression: {image.expression}<br />
                Body: {image.body_type}<br />
                Pose: {image.pose}<br />
                {new Date(image.created_at).toLocaleString()}
              </span>
              {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive Link</a> : null}
              {image.google_drive_url ? <a href={image.google_drive_url} target="_blank" download>Download</a> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
