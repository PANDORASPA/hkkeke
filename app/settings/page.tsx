"use client";

import { useState } from "react";

type Health = {
  supabase: { ok: boolean; message: string };
  googleDrive: { ok: boolean; message: string };
  openai: { ok: boolean; message: string };
  folders: Record<string, string | undefined>;
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
          <h2>Environment Variables</h2>
          <p className="muted">
            Folder IDs and API keys are server-side environment variables. Set them in Vercel or `.env.local`.
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
              <h3>Folder IDs</h3>
              <pre>{JSON.stringify(health.folders, null, 2)}</pre>
            </div>
          ) : null}
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

function HealthCard(props: { title: string; item: { ok: boolean; message: string } }) {
  return (
    <p className={`status ${props.item.ok ? "ok" : "error"}`}>
      <strong>{props.title}</strong><br />
      {props.item.message}
    </p>
  );
}
