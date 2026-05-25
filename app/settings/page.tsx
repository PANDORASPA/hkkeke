"use client";

import { useState } from "react";

type Health = {
  supabase: { ok: boolean; message: string };
  googleDrive: { ok: boolean; message: string };
  openai: { ok: boolean; message: string };
  folders: Record<string, string>;
  env: Record<string, string>;
};

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  async function testConnections() {
    setLoading(true);
    const response = await fetch("/api/health");
    setHealth(await response.json());
    setLoading(false);
  }

  return (
    <main className="page">
      <h1>Settings</h1>
      <section className="settings-grid">
        <div className="panel">
          <h2>Vercel Environment</h2>
          <p className="muted">
            在 Vercel Project Settings / Environment Variables 填以下值。Server-side keys 不會在前端顯示。
          </p>
          <EnvList />
        </div>
        <div className="panel">
          <h2>Connection Tests</h2>
          <button className="primary" onClick={testConnections} disabled={loading}>
            {loading ? "Testing..." : "Test Connections"}
          </button>
          {health ? (
            <div>
              <HealthCard title="Supabase" item={health.supabase} />
              <HealthCard title="Google Drive" item={health.googleDrive} />
              <HealthCard title="OpenAI" item={health.openai} />
              <h3>Environment Status</h3>
              <StatusList items={health.env} />
              <h3>Folder IDs</h3>
              <StatusList items={health.folders} />
            </div>
          ) : null}
        </div>
        <div className="panel">
          <h2>Deploy Checklist</h2>
          <ol className="checklist">
            <li>在 Supabase SQL Editor 執行 <code>supabase/migrations/001_ai_girl_generator.sql</code>。</li>
            <li>建立 Google service account，下載 JSON key，將 client email 分享到整個 Drive root folder。</li>
            <li>把所有 folder ID 和 API keys 貼入 Vercel Production / Preview / Development。</li>
            <li>重新部署 Vercel，再按 Test Connections，三項都變綠才正式生成。</li>
          </ol>
        </div>
        <div className="panel">
          <h2>Drive Folder Map</h2>
          <p className="muted">建議 root folder 叫 <strong>AI-Girl-Generator</strong>，下面照固定分類放素材。</p>
          <pre>{`AI-Girl-Generator/
01_Scenes_場景/
02_Girl_References_女仔參考/
03_Outfits_衣服/
04_Hair_髮型髮色/
05_Poses_姿勢/
06_Generated_成品/`}</pre>
        </div>
      </section>
    </main>
  );
}

function EnvList() {
  const envs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_CLIENT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    "GOOGLE_DRIVE_SCENES_FOLDER_ID",
    "GOOGLE_DRIVE_GIRLS_FOLDER_ID",
    "GOOGLE_DRIVE_OUTFITS_FOLDER_ID",
    "GOOGLE_DRIVE_HAIR_FOLDER_ID",
    "GOOGLE_DRIVE_POSES_FOLDER_ID",
    "GOOGLE_DRIVE_GENERATED_FOLDER_ID"
  ];
  return (
    <ul>
      {envs.map((env) => <li key={env}><code>{env}</code></li>)}
    </ul>
  );
}

function StatusList(props: { items: Record<string, string> }) {
  return (
    <div className="status-list">
      {Object.entries(props.items).map(([key, value]) => (
        <div key={key}>
          <code>{key}</code>
          <span className={value === "set" ? "ok-text" : "error-text"}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function HealthCard(props: { title: string; item: { ok: boolean; message: string } }) {
  return (
    <p className={`status ${props.item.ok ? "ok" : "error"}`}>
      <strong>{props.title}</strong><br />
      {props.item.message}
    </p>
  );
}
