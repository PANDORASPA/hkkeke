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
      // 連接測試會顯示可操作的錯誤。
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
      setKeyStatus({ configured: true, masked: json.masked, source: json.source || "cookie" });
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
      setMessage("連接測試失敗，請稍後再試。");
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
            Supabase 和 Google Drive 使用 Vercel server-side env；OpenAI API key 可以在這裡輸入。
            如果 Supabase 暫停，系統會先用本機瀏覽器 httpOnly cookie 保存 OpenAI key。
          </p>
        </div>
        <button className="primary" onClick={testConnections} disabled={loading}>
          {loading ? "測試中..." : "測試連接"}
        </button>
      </div>

      <section className="settings-grid">
        <div className="panel">
          <h2>OpenAI API Key</h2>
          <p className="muted">
            這裡只保存 key，不會顯示完整內容。測試會檢查 <code>gpt-image-1.5</code> 圖片模型是否可用。
            如果出現 HTTP 403，通常是 Project 權限、restricted key 權限，或 Organization Verification 未完成。
          </p>
          <p className={`status ${keyStatus?.configured ? "ok" : "error"}`}>
            <strong>狀態</strong><br />
            {keyStatus?.configured
              ? `已設定：${keyStatus.masked}（來源：${sourceLabel(keyStatus.source)}）`
              : "未設定 OpenAI API key"}
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
          <h2>連接狀態</h2>
          {health ? (
            <div>
              <HealthCard title="Supabase" item={health.supabase} />
              <HealthCard title="Google Drive" item={health.googleDrive} />
              <HealthCard title="OpenAI" item={health.openai} />
              <h3>環境變數</h3>
              <StatusList items={health.env} />
              <h3>Drive Folder IDs</h3>
              <StatusList items={health.folders} />
            </div>
          ) : (
            <p className="muted">按「測試連接」檢查 Supabase、Google Drive、OpenAI 是否可用。</p>
          )}
        </div>

        <div className="panel">
          <h2>正確使用方法</h2>
          <ol className="checklist">
            <li>把場景圖片放到 <code>01_Scenes_場景</code> 或其子資料夾。</li>
            <li>把女仔參考、衣服、髮型、姿勢圖片放到對應資料夾。</li>
            <li>到「生成圖片」頁按「同步 Google Drive 素材」。</li>
            <li>最少選一張場景圖；其他參考圖可選可不選。</li>
            <li>設定風格、髮型、衣服、表情、身材、姿勢，再生成或加入列隊。</li>
            <li>生成結果會自動保存到本機 Gallery；如 Google Drive 可寫入，亦會上傳到成品資料夾。</li>
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
          <p className="muted">
            目前 app 會讀取每個主要資料夾和下一層子資料夾內的圖片。子資料夾名稱會當作素材分類，方便之後篩選和整理。
          </p>
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

function sourceLabel(source: string) {
  if (source === "cookie") return "本機 cookie";
  if (source === "supabase") return "Supabase";
  if (source === "env") return "Vercel env";
  return source;
}
