"use client";

import { useEffect, useState } from "react";

type HealthItem = {
  ok: boolean;
  message: string;
};

type AutomationStatus = {
  ok: boolean;
  ready: boolean;
  message: string;
  blockers: string[];
  warnings: string[];
  cronSecret: string;
  vercelDailyCron: string;
  githubHourlyWorkflow: string;
  githubOidc: string;
  targetPerRun: string;
  estimatedDailyImages: string;
  sceneReplenish: string;
  sceneReserveTarget: string;
  sceneVariationsPerRun: string;
  route: string;
  lastRun?: Record<string, unknown> | null;
};

type Health = {
  supabase: HealthItem;
  googleDrive: HealthItem;
  openai: HealthItem;
  automation: AutomationStatus;
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
  const [manualRunning, setManualRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [manualMessage, setManualMessage] = useState("");

  useEffect(() => {
    fetchOpenAIKeyStatus();
    testConnections();
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
      setMessage(json.message || json.test?.message || "OpenAI API key 已儲存。");
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

  async function runManualProduction(targetImages: number) {
    setManualRunning(true);
    setManualMessage(`正在手動試跑 ${targetImages} 張；會讀 Drive 素材、必要時補場景、生成圖片、上傳 Drive、寫入 manifest...`);
    try {
      const response = await fetch("/api/manual-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetImages })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "手動試跑失敗。");
      setManualMessage([
        `試跑完成：生成 ${json.generatedCount || 0}/${json.targetImages || targetImages} 張。`,
        `Drive 連結：${(json.batches || []).flatMap((batch: { driveUrls?: string[] }) => batch.driveUrls || []).length} 個。`,
        json.sceneReplenish?.createdCount ? `已自動補充場景 ${json.sceneReplenish.createdCount} 張。` : "本次沒有需要補充場景。",
        json.warnings?.length ? `提示：${json.warnings.join(" ")}` : ""
      ].filter(Boolean).join("\n"));
      await testConnections();
    } catch (error) {
      setManualMessage(error instanceof Error ? error.message : "手動試跑失敗。");
    } finally {
      setManualRunning(false);
    }
  }

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>設定</h1>
          <p className="muted">檢查 Supabase、Google Drive、OpenAI，以及全自動生產是否真正 ready。</p>
        </div>
        <button className="primary" onClick={testConnections} disabled={loading}>
          {loading ? "測試中..." : "測試連接"}
        </button>
      </div>

      <section className="settings-grid">
        <div className="panel">
          <h2>OpenAI API Key</h2>
          <p className="muted">
            手動生成會使用本機 cookie。全自動生產會優先使用 Supabase、Google Drive 加密設定檔或 Vercel env。
          </p>
          <p className={`status ${keyStatus?.configured ? "ok" : "error"}`}>
            <strong>狀態</strong><br />
            {keyStatus?.configured
              ? `已設定：${keyStatus.masked}（來源：${sourceLabel(keyStatus.source)}）`
              : "未設定 OpenAI API key"}
          </p>
          <label>
            輸入 OpenAI API key
            <input type="password" value={apiKey} placeholder="sk-..." onChange={(event) => setApiKey(event.target.value)} />
          </label>
          <button className="primary" onClick={saveOpenAIKey} disabled={savingKey || !apiKey.trim()}>
            {savingKey ? "儲存中..." : "測試並儲存"}
          </button>
          {message ? <pre className="status-note">{message}</pre> : null}
        </div>

        <div className="panel">
          <h2>立即試跑</h2>
          <p className="muted">
            儲存 OpenAI key 後，可即時試跑。這會真的生成圖片並上傳 Google Drive，用來確認不用等 GitHub Actions 整點排程。
          </p>
          <div className="card-actions">
            <button type="button" onClick={() => runManualProduction(1)} disabled={manualRunning}>
              {manualRunning ? "試跑中..." : "試跑 1 張"}
            </button>
            <button type="button" onClick={() => runManualProduction(4)} disabled={manualRunning}>
              試跑 4 張
            </button>
            <a className="secondary-link" href="/gallery">去 Gallery 查看</a>
          </div>
          {manualMessage ? <pre className="status-note">{manualMessage}</pre> : null}
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
          <h2>自動生產</h2>
          {health ? (
            <div>
              <p className={`status ${health.automation.ready ? "ok" : "error"}`}>
                <strong>{health.automation.ready ? "全自動已準備" : "全自動未完成"}</strong><br />
                {health.automation.message}
              </p>
              {health.automation.blockers?.length ? (
                <div className="readiness-list warning">
                  {health.automation.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}
                </div>
              ) : null}
              {health.automation.warnings?.length ? (
                <div className="readiness-list warning">
                  {health.automation.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                </div>
              ) : null}
              <StatusList
                items={{
                  route: health.automation.route,
                  cronSecret: health.automation.cronSecret,
                  vercelDailyCron: health.automation.vercelDailyCron,
                  githubHourlyWorkflow: health.automation.githubHourlyWorkflow,
                  githubOidc: health.automation.githubOidc,
                  targetPerRun: health.automation.targetPerRun,
                  estimatedDailyImages: health.automation.estimatedDailyImages,
                  sceneReplenish: health.automation.sceneReplenish,
                  sceneReserveTarget: health.automation.sceneReserveTarget,
                  sceneVariationsPerRun: health.automation.sceneVariationsPerRun
                }}
              />
              <p className="muted">
                GitHub Actions 會每小時觸發自動生產；Vercel daily cron 作後備。自動場景補貨會在生產前補充背景庫，減少同場景重複。
              </p>
              <h3>最後一次自動生產</h3>
              {health.automation.lastRun ? (
                <pre>{JSON.stringify(health.automation.lastRun, null, 2)}</pre>
              ) : (
                <p className="muted">未有自動生產紀錄。可先用「立即試跑」，或等下一個 GitHub Actions 排程。</p>
              )}
            </div>
          ) : (
            <p className="muted">測試連接後會顯示自動生產狀態。</p>
          )}
        </div>

        <div className="panel">
          <h2>正確使用方法</h2>
          <ol className="checklist">
            <li>把場景圖片放到 <code>01_Scenes_場景</code> 或其子資料夾。</li>
            <li>把女仔參考、衣服、髮型、姿勢圖片放到對應資料夾。</li>
            <li>到「生成圖片」頁按「同步 Google Drive 素材」。</li>
            <li>場景庫少時，按「自動補 3 張場景庫」建立背景儲備。</li>
            <li>設定頁儲存 OpenAI key 後，先用「試跑 1 張」確認上傳 Drive 成功。</li>
            <li>成功後，可交由 GitHub Actions 每小時自動生產。</li>
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
            App 會讀取每個主要資料夾和下一層子資料夾的圖片。Drive root 亦會保存加密設定檔和成品 manifest，用作全自動後備紀錄。
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
          <span className={value === "set" || value === "true" ? "ok-text" : value === "missing" || value.startsWith("Missing") ? "error-text" : ""}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function HealthCard(props: { title: string; item: HealthItem }) {
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
  if (source === "drive") return "Google Drive 加密設定檔";
  if (source === "env") return "Vercel env";
  if (source === "supabase+cookie") return "Supabase + 本機 cookie";
  if (source === "drive+cookie") return "Google Drive 加密設定檔 + 本機 cookie";
  return source;
}
