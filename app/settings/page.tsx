"use client";

import { useEffect, useState } from "react";

type Health = {
  supabase: { ok: boolean; message: string };
  googleDrive: { ok: boolean; message: string };
  openai: { ok: boolean; message: string };
  folders: Record<string, string>;
  env: Record<string, string>;
};

type OpenAIKeyStatus = {
  configured: boolean;
  masked: string;
  source: string;
};

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [keyStatus, setKeyStatus] = useState<OpenAIKeyStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchOpenAIKeyStatus();
  }, []);

  async function fetchOpenAIKeyStatus() {
    try {
      const response = await fetch("/api/settings/openai-key");
      const json = await response.json();
      if (response.ok) setKeyStatus(json);
    } catch {
      // ignore; health check will show the real issue.
    }
  }

  async function saveOpenAIKey() {
    setSavingKey(true);
    setMessage("正在測試並儲存 OpenAI API key...");
    try {
      const response = await fetch("/api/settings/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "儲存失敗。");
      setApiKey("");
      setKeyStatus({ configured: true, masked: json.masked, source: "settings" });
      setMessage(json.test?.message || json.message || "OpenAI API key 已儲存。");
      await testConnections();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "儲存失敗。");
    } finally {
      setSavingKey(false);
    }
  }

  async function testConnections() {
    setLoading(true);
    try {
      const response = await fetch("/api/health");
      setHealth(await response.json());
    } catch {
      setMessage("連線測試失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>設定</h1>
          <p className="muted">
            Supabase 和 Google Drive 已放在 Vercel server-side env；OpenAI API key 可在這裡輸入，
            只會送到 server route，並儲存在 Supabase <code>app_settings</code>。
          </p>
        </div>
        <button className="primary" onClick={testConnections} disabled={loading}>
          {loading ? "測試中..." : "測試連線"}
        </button>
      </div>

      <section className="settings-grid">
        <div className="panel">
          <h2>OpenAI API Key</h2>
          <p className="muted">
            測試會檢查 <code>gpt-image-1.5</code> 模型權限。若出現 HTTP 403，通常代表 OpenAI Project/API key
            權限不足，或 GPT Image 需要先完成 Organization Verification。
          </p>
          <p className={`status ${keyStatus?.configured ? "ok" : "error"}`}>
            <strong>狀態</strong><br />
            {keyStatus?.configured ? `已設定：${keyStatus.masked}` : "未設定 OpenAI API key"}
          </p>
          <label>
            輸入 OpenAI API key
            <input
              type="password"
              value={apiKey}
              placeholder="sk-..."
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <button className="primary" onClick={saveOpenAIKey} disabled={savingKey || !apiKey.trim()}>
            {savingKey ? "儲存中..." : "測試並儲存"}
          </button>
          {message ? <pre className="status-note">{message}</pre> : null}
        </div>

        <div className="panel">
          <h2>連線狀態</h2>
          {health ? (
            <div>
              <HealthCard title="Supabase" item={health.supabase} />
              <HealthCard title="Google Drive" item={health.googleDrive} />
              <HealthCard title="OpenAI" item={health.openai} />
              <h3>環境狀態</h3>
              <StatusList items={health.env} />
              <h3>Drive Folder IDs</h3>
              <StatusList items={health.folders} />
            </div>
          ) : (
            <p className="muted">按「測試連線」檢查 Supabase、Google Drive、OpenAI 是否可用。</p>
          )}
        </div>

        <div className="panel">
          <h2>正確使用方法</h2>
          <ol className="checklist">
            <li>把場景圖片放到 <code>01_Scenes_場景</code> 或其子資料夾。</li>
            <li>把女仔參考、衣服、髮型、姿勢圖片放到對應資料夾。</li>
            <li>到「生成」頁按「同步 Google Drive 素材」。</li>
            <li>最少選一張場景圖；其他參考圖可選可不選。</li>
            <li>設定風格、髮型、衣服、表情、姿勢，再生成。</li>
            <li>生成結果會自動上傳到 <code>06_Generated_成品</code>，並寫入 Supabase 圖庫紀錄。</li>
          </ol>
        </div>

        <div className="panel">
          <h2>Google Drive 結構</h2>
          <pre>{`AI-Girl-Generator/
01_Scenes_場景/
02_Girl_References_女仔參考/
03_Outfits_衣服/
04_Hair_髮型髮色/
05_Poses_姿勢/
06_Generated_成品/`}</pre>
          <p className="muted">目前 app 會讀取每個主要資料夾及下一層子資料夾內的圖片。子資料夾名會變成素材分類。</p>
        </div>
      </section>
    </main>
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
