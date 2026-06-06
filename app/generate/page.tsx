"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BODY_TYPES,
  EXPRESSIONS,
  GIRL_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OPTION_LABELS,
  OUTFITS,
  POSES
} from "@/lib/options";
import { buildPrompt } from "@/lib/prompt";
import {
  buildLocalManifest,
  deleteLocalAsset,
  downloadJson,
  loadLocalAssets,
  loadLocalQueue,
  LocalQueueJob,
  saveGeneratedBatch,
  saveLocalQueue,
  saveLocalAsset,
  updateLocalImageStatus
} from "@/lib/local-history";
import { DriveAsset, GeneratedImage, GeneratePayload } from "@/lib/types";

type AssetsByCategory = {
  scene: DriveAsset[];
  girl: DriveAsset[];
  outfit: DriveAsset[];
  hair: DriveAsset[];
  pose: DriveAsset[];
};

type SceneVariation = {
  id: string;
  data_url: string;
  file_name: string;
  prompt: string;
  created_at: string;
};

type QueueJob = LocalQueueJob;
type QueueJobStatus = LocalQueueJob["status"];

const emptyAssets: AssetsByCategory = {
  scene: [],
  girl: [],
  outfit: [],
  hair: [],
  pose: []
};

const categoryLabels: Record<keyof AssetsByCategory, string> = {
  scene: "場景",
  girl: "女仔參考",
  outfit: "衣服",
  hair: "髮型髮色",
  pose: "姿勢"
};

export default function GeneratePage() {
  const [assets, setAssets] = useState<AssetsByCategory>(emptyAssets);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [status, setStatus] = useState("正在讀取 Google Drive 素材...");
  const [selectedScene, setSelectedScene] = useState("");
  const [selectedGirl, setSelectedGirl] = useState("");
  const [selectedOutfitAsset, setSelectedOutfitAsset] = useState("");
  const [selectedHairAsset, setSelectedHairAsset] = useState("");
  const [selectedPoseAsset, setSelectedPoseAsset] = useState("");
  const [form, setForm] = useState({
    girlStyle: "sweet",
    hairStyle: "wavy hair",
    hairColor: "milk tea brown",
    outfit: "summer outfit",
    bodyType: "curvy",
    expression: "natural smile",
    pose: "standing",
    count: "1",
    extraPrompt: ""
  });
  const [generating, setGenerating] = useState(false);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [sceneVariation, setSceneVariation] = useState<SceneVariation | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const queueRef = useRef<QueueJob[]>([]);
  const queueRunningRef = useRef(false);
  const queueSaveChainRef = useRef(Promise.resolve());

  useEffect(() => {
    fetchAssets();
    restoreQueue();
  }, []);

  async function restoreQueue() {
    try {
      const storedQueue = await loadLocalQueue();
      const normalizedQueue = storedQueue.map((job) => (
        job.status === "running"
          ? { ...job, status: "failed" as const, message: "頁面曾經重新載入，請按重試繼續。" }
          : job
      ));
      queueRef.current = normalizedQueue;
      setQueue(normalizedQueue);
      if (normalizedQueue.some((job, index) => job !== storedQueue[index])) {
        await saveLocalQueue(normalizedQueue);
      }
      if (normalizedQueue.length) {
        setStatus(`已恢復 ${normalizedQueue.length} 個列隊任務。`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "讀取列隊失敗。");
    }
  }

  async function fetchAssets() {
    setLoadingAssets(true);
    setStatus("正在同步 Google Drive 素材...");
    try {
      const localAssets = await loadLocalAssets();
      const response = await fetch("/api/drive/assets");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "讀取素材失敗。");
      const grouped = groupAssets([...(json.assets as DriveAsset[]), ...localAssets]);
      setAssets(grouped);
      setSelectedScene(grouped.scene[0]?.id || "");
      setSelectedGirl(grouped.girl[0]?.id || "");
      setSelectedOutfitAsset(grouped.outfit[0]?.id || "");
      setSelectedHairAsset(grouped.hair[0]?.id || "");
      setSelectedPoseAsset(grouped.pose[0]?.id || "");
      const syncMessage = json.sync?.ok === false ? `（Supabase 同步提示：${json.sync.message}）` : "";
      setStatus(`已同步 ${json.assets.length} 張 Drive 素材，載入 ${localAssets.length} 張本地素材。${syncMessage}`);
    } catch (error) {
      try {
        const localAssets = await loadLocalAssets();
        const grouped = groupAssets(localAssets);
        setAssets(grouped);
        setSelectedScene(grouped.scene[0]?.id || "");
        setStatus(`${error instanceof Error ? error.message : "讀取 Drive 素材失敗。"} 已載入 ${localAssets.length} 張本地素材。`);
      } catch {
        setStatus(error instanceof Error ? error.message : "讀取素材失敗。");
      }
    } finally {
      setLoadingAssets(false);
    }
  }

  function selectScene(id: string) {
    setSelectedScene(id);
    setSceneVariation(null);
  }

  const payload: GeneratePayload = useMemo(() => {
    const scene = assets.scene.find((asset) => asset.id === selectedScene);
    const girl = assets.girl.find((asset) => asset.id === selectedGirl);
    const outfit = assets.outfit.find((asset) => asset.id === selectedOutfitAsset);
    const hair = assets.hair.find((asset) => asset.id === selectedHairAsset);
    const pose = assets.pose.find((asset) => asset.id === selectedPoseAsset);
    return {
      sceneAssetId: selectedScene,
      sceneDataUrl: sceneVariation?.data_url || scene?.data_url || undefined,
      sceneFileName: sceneVariation?.file_name || scene?.file_name || undefined,
      girlReferenceAssetId: selectedGirl || undefined,
      girlReferenceDataUrl: girl?.data_url || undefined,
      girlReferenceFileName: girl?.file_name || undefined,
      outfitAssetId: selectedOutfitAsset || undefined,
      outfitDataUrl: outfit?.data_url || undefined,
      outfitFileName: outfit?.file_name || undefined,
      hairAssetId: selectedHairAsset || undefined,
      hairDataUrl: hair?.data_url || undefined,
      hairFileName: hair?.file_name || undefined,
      poseAssetId: selectedPoseAsset || undefined,
      poseDataUrl: pose?.data_url || undefined,
      poseFileName: pose?.file_name || undefined,
      girlStyle: form.girlStyle,
      hairStyle: form.hairStyle,
      hairColor: form.hairColor,
      outfit: form.outfit,
      bodyType: form.bodyType,
      expression: form.expression,
      pose: form.pose,
      extraPrompt: form.extraPrompt,
      count: Number(form.count) as 1 | 2 | 4
    };
  }, [assets, form, sceneVariation, selectedGirl, selectedHairAsset, selectedOutfitAsset, selectedPoseAsset, selectedScene]);

  const promptPreview = useMemo(() => buildPrompt(payload), [payload]);

  const selectedAssets = useMemo(
    () => [
      assets.scene.find((asset) => asset.id === selectedScene),
      assets.girl.find((asset) => asset.id === selectedGirl),
      assets.outfit.find((asset) => asset.id === selectedOutfitAsset),
      assets.hair.find((asset) => asset.id === selectedHairAsset),
      assets.pose.find((asset) => asset.id === selectedPoseAsset)
    ].filter(Boolean) as DriveAsset[],
    [assets, selectedScene, selectedGirl, selectedOutfitAsset, selectedHairAsset, selectedPoseAsset]
  );

  function updateQueue(updater: (current: QueueJob[]) => QueueJob[]) {
    const next = updater(queueRef.current);
    queueRef.current = next;
    setQueue(next);
    queueSaveChainRef.current = queueSaveChainRef.current
      .then(() => saveLocalQueue(next))
      .catch(() => saveLocalQueue(next));
  }

  async function runGenerationPayload(payloadSnapshot: GeneratePayload, assetSnapshot: DriveAsset[]) {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadSnapshot)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "生成失敗。");
    const savedImages = await saveGeneratedBatch({ images: json.images, payload: payloadSnapshot, assets: assetSnapshot });
    return {
      images: savedImages,
      warning: json.warnings?.length ? ` 提示：${json.warnings.join(" ")}` : ""
    };
  }

  async function generate() {
    if (!selectedScene) {
      setStatus("請先選擇一張場景圖。把圖片放入 Google Drive 的 01_Scenes_場景 後，按「同步素材」。");
      return;
    }

    setGenerating(true);
    setResults([]);
    setStatus("正在生成圖片，請等候...");
    try {
      const generated = await runGenerationPayload(payload, selectedAssets);
      setResults(generated.images);
      setStatus(`完成生成 ${generated.images.length} 張圖片，已保存到本地歷史。${generated.warning}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "生成失敗。");
    } finally {
      setGenerating(false);
    }
  }

  function enqueueCurrent() {
    if (!selectedScene) {
      setStatus("請先選擇一張場景圖，才可以加入列隊。");
      return;
    }
    const scene = assets.scene.find((asset) => asset.id === selectedScene);
    const sceneLabel = sceneVariation ? "相似場景" : scene ? assetName(scene) : "未命名場景";
    const job: QueueJob = {
      id: crypto.randomUUID(),
      label: `${sceneLabel} / ${label(form.girlStyle)} / ${label(form.outfit)} / ${form.count} 張`,
      payload: { ...payload },
      assets: [...selectedAssets],
      status: "pending",
      message: "等待生成",
      createdAt: new Date().toISOString()
    };
    updateQueue((current) => [job, ...current]);
    setStatus("已加入列隊。你可以繼續改設定再加入下一個任務。");
  }

  async function processQueue() {
    if (queueRunningRef.current) return;
    queueRunningRef.current = true;
    setQueueRunning(true);
    setStatus("列隊開始處理，會逐個任務生成，減少 rate limit 風險。");
    try {
      while (true) {
        const job = queueRef.current.find((item) => item.status === "pending");
        if (!job) break;
        updateQueue((current) => current.map((item) => item.id === job.id ? { ...item, status: "running", message: "生成中..." } : item));
        try {
          const generated = await runGenerationPayload(job.payload, job.assets);
          setResults(generated.images);
          updateQueue((current) => current.map((item) => (
            item.id === job.id
              ? { ...item, status: "done", message: `完成 ${generated.images.length} 張。${generated.warning}`.trim(), results: generated.images }
              : item
          )));
        } catch (error) {
          const message = error instanceof Error ? error.message : "生成失敗。";
          updateQueue((current) => current.map((item) => item.id === job.id ? { ...item, status: "failed", message } : item));
        }
      }
      setStatus("列隊已處理完成。失敗任務可以單個重試。");
    } finally {
      queueRunningRef.current = false;
      setQueueRunning(false);
    }
  }

  function retryQueueJob(id: string) {
    updateQueue((current) => current.map((item) => item.id === id ? { ...item, status: "pending", message: "等待重試" } : item));
    void processQueue();
  }

  function clearFinishedQueueJobs() {
    updateQueue((current) => current.filter((item) => item.status !== "done"));
  }

  function deleteQueueJob(id: string) {
    updateQueue((current) => current.filter((item) => item.id !== id || item.status === "running"));
  }

  function clearQueue() {
    updateQueue((current) => current.filter((item) => item.status === "running"));
  }

  async function generateSimilarScene() {
    const scene = assets.scene.find((asset) => asset.id === selectedScene);
    if (!scene?.id) {
      setStatus("請先選擇一張場景圖。");
      return;
    }

    setGeneratingScene(true);
    setStatus("正在生成相似場景...");
    try {
      const response = await fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneAssetId: scene.google_drive_file_id,
          sceneDataUrl: scene.data_url,
          sceneFileName: scene.file_name,
          sceneName: assetName(scene),
          extraPrompt: form.extraPrompt
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "生成相似場景失敗。");
      setSceneVariation(json.image);
      setStatus("已生成相似場景；下一次生成圖片會自動使用這張新場景作背景。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "生成相似場景失敗。");
    } finally {
      setGeneratingScene(false);
    }
  }

  async function uploadLocalAsset(category: keyof AssetsByCategory, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("請上傳圖片檔案。");
      return;
    }
    const asset = await saveLocalAsset({ file, category });
    setAssets((current) => {
      const next = { ...current, [category]: [asset, ...current[category]] };
      if (category === "scene" && !selectedScene) setSelectedScene(asset.id);
      return next;
    });
    setStatus(`已加入本地${categoryLabels[category]}素材：${file.name}`);
  }

  async function removeLocalAsset(asset: DriveAsset) {
    if (!asset.id || asset.source !== "local") return;
    await deleteLocalAsset(asset.id);
    setAssets((current) => {
      const category = asset.category as keyof AssetsByCategory;
      return { ...current, [category]: current[category].filter((item) => item.id !== asset.id) };
    });
    if (selectedScene === asset.id) setSelectedScene("");
    if (selectedGirl === asset.id) setSelectedGirl("");
    if (selectedOutfitAsset === asset.id) setSelectedOutfitAsset("");
    if (selectedHairAsset === asset.id) setSelectedHairAsset("");
    if (selectedPoseAsset === asset.id) setSelectedPoseAsset("");
    setStatus("已刪除本地素材。");
  }

  async function markResult(id: string, status: "selected" | "rejected") {
    await updateLocalImageStatus(id, status);
    setResults((current) => current.map((image) => image.id === id ? { ...image, local_status: status } : image));
  }

  async function exportManifest() {
    const manifest = await buildLocalManifest();
    downloadJson(manifest, `ai-girl-generator_${new Date().toISOString().slice(0, 10)}.json`);
  }

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>生成圖片</h1>
          <p className="muted">正確流程：先把素材圖片放入 Google Drive 分類資料夾，再同步素材，選場景和設定，最後生成。</p>
        </div>
        <a className="secondary-link" href="/settings">檢查 API 設定</a>
      </div>

      <div className="generate-layout">
        <section className="panel">
          <h2>場景素材庫</h2>
          <button onClick={fetchAssets} disabled={loadingAssets}>
            {loadingAssets ? "同步中..." : "同步 Google Drive 素材"}
          </button>
          <p className="muted">{status}</p>
          <LocalAssetUploader onUpload={uploadLocalAsset} />
          <AssetGrid assets={assets.scene} selectedId={selectedScene} onSelect={selectScene} category="scene" onDelete={removeLocalAsset} />
        </section>

        <section className="panel">
          <h2>生成設定</h2>
          <div className="controls-grid">
            <Select label="女仔風格" value={form.girlStyle} options={GIRL_STYLES} onChange={(girlStyle) => setForm({ ...form, girlStyle })} />
            <Select label="髮型" value={form.hairStyle} options={HAIR_STYLES} onChange={(hairStyle) => setForm({ ...form, hairStyle })} />
            <Select label="髮色" value={form.hairColor} options={HAIR_COLORS} onChange={(hairColor) => setForm({ ...form, hairColor })} />
            <Select label="衣服" value={form.outfit} options={OUTFITS} onChange={(outfit) => setForm({ ...form, outfit })} />
            <Select label="身材比例" value={form.bodyType} options={BODY_TYPES} onChange={(bodyType) => setForm({ ...form, bodyType })} />
            <Select label="表情" value={form.expression} options={EXPRESSIONS} onChange={(expression) => setForm({ ...form, expression })} />
            <Select label="動作姿勢" value={form.pose} options={POSES} onChange={(pose) => setForm({ ...form, pose })} />
            <Select label="生成數量" value={form.count} options={["1", "2", "4"]} onChange={(count) => setForm({ ...form, count })} />
          </div>
          <label>
            額外 prompt
            <textarea value={form.extraPrompt} placeholder="例如：黃昏光線、手機街拍、自然構圖" onChange={(event) => setForm({ ...form, extraPrompt: event.target.value })} />
          </label>
          <ReferenceSelect label="女仔參考圖（可選）" value={selectedGirl} assets={assets.girl} onChange={setSelectedGirl} />
          <ReferenceSelect label="衣服參考圖（可選）" value={selectedOutfitAsset} assets={assets.outfit} onChange={setSelectedOutfitAsset} />
          <ReferenceSelect label="髮型參考圖（可選）" value={selectedHairAsset} assets={assets.hair} onChange={setSelectedHairAsset} />
          <ReferenceSelect label="姿勢參考圖（可選）" value={selectedPoseAsset} assets={assets.pose} onChange={setSelectedPoseAsset} />
        </section>

        <section className="panel">
          <h2>已選素材</h2>
          <AssetGrid assets={selectedAssets} selectedId="" onSelect={() => undefined} onDelete={removeLocalAsset} />
          <div className="scene-variation">
            <button onClick={generateSimilarScene} disabled={generatingScene || !selectedScene}>
              {generatingScene ? "生成相似場景中..." : "按目前場景生成相似場景"}
            </button>
            {sceneVariation ? (
              <article className="asset-card selected">
                <img src={sceneVariation.data_url} alt="相似場景" />
                <div>
                  <strong>臨時相似場景</strong>
                  <span>主生成會使用這張場景；如想長期保存，請下載後放回 Drive 場景庫。</span>
                  <div className="card-actions">
                    <a href={sceneVariation.data_url} download={sceneVariation.file_name}>下載場景</a>
                    <button type="button" onClick={() => setSceneVariation(null)}>改回原場景</button>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
          <button className="primary" onClick={generate} disabled={generating || !selectedScene}>
            {generating ? "生成中..." : `生成 ${form.count} 張圖片`}
          </button>
          <div className="queue-panel">
            <div>
              <strong>生成列隊</strong>
              <p className="muted">適合一次排幾組場景/造型，系統會逐個生成；列隊會保存在本機，刷新後仍可重試未完成任務。</p>
            </div>
            <div className="card-actions">
              <button type="button" onClick={enqueueCurrent} disabled={!selectedScene}>加入列隊</button>
              <button type="button" onClick={processQueue} disabled={queueRunning || !queue.some((job) => job.status === "pending")}>
                {queueRunning ? "列隊處理中..." : "開始列隊"}
              </button>
              <button type="button" onClick={clearFinishedQueueJobs} disabled={!queue.some((job) => job.status === "done")}>清走完成</button>
              <button type="button" onClick={clearQueue} disabled={!queue.some((job) => job.status !== "running")}>清空列隊</button>
            </div>
            {queue.length ? (
              <div className="queue-list">
                {queue.map((job) => (
                  <article className={`queue-item ${job.status}`} key={job.id}>
                    <div>
                      <strong>{job.label}</strong>
                      <span>{queueStatusLabel(job.status)} / {job.message}</span>
                    </div>
                    <div className="queue-actions">
                      {job.status === "failed" ? <button type="button" onClick={() => retryQueueJob(job.id)}>重試</button> : null}
                      {job.status !== "running" ? <button type="button" onClick={() => deleteQueueJob(job.id)}>刪除</button> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">未有列隊任務。</p>
            )}
          </div>
          <div className="prompt-preview">
            <strong>Prompt 預覽</strong>
            <pre>{promptPreview}</pre>
          </div>
          <h2>生成結果</h2>
          {results.length ? <button onClick={exportManifest}>匯出本地素材包 JSON</button> : null}
          <div className="result-grid">
            {results.map((image) => (
              <article className="image-card" key={image.id}>
                {image.data_url || image.thumbnail_url ? (
                  <img src={image.data_url || image.thumbnail_url || ""} alt="生成圖片" />
                ) : (
                  <div className="image-placeholder">無預覽</div>
                )}
                <div>
                  <strong>{label(image.girl_style)} / {label(image.outfit)}</strong>
                  {image.local_status ? <span>狀態：{statusLabel(image.local_status)}</span> : null}
                  {image.upload_warning ? <span className="error-text">{image.upload_warning}</span> : null}
                  <span>{image.prompt}</span>
                  <div className="card-actions">
                    <button type="button" onClick={() => markResult(image.id, "selected")}>保留</button>
                    <button type="button" onClick={() => markResult(image.id, "rejected")}>唔要</button>
                    {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive</a> : null}
                    {image.data_url ? (
                      <a href={image.data_url} download={image.file_name || "generated.png"}>下載</a>
                    ) : (
                      <a href={`/api/generated/${image.id}/download`}>下載</a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
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

function queueStatusLabel(value: QueueJobStatus) {
  if (value === "pending") return "等待中";
  if (value === "running") return "生成中";
  if (value === "done") return "完成";
  return "失敗";
}

function Select(props: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      {props.label}
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => <option key={option} value={option}>{label(option)}</option>)}
      </select>
    </label>
  );
}

function ReferenceSelect(props: { label: string; value: string; assets: DriveAsset[]; onChange: (id: string) => void }) {
  return (
    <label>
      {props.label}
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        <option value="">不使用</option>
        {props.assets.map((asset) => <option key={asset.id} value={asset.id}>{assetName(asset)}</option>)}
      </select>
    </label>
  );
}

function assetName(asset: DriveAsset) {
  return asset.sub_category ? `${asset.sub_category} / ${asset.file_name}` : asset.file_name || asset.google_drive_file_id;
}

function groupAssets(assetList: DriveAsset[]) {
  const grouped = { scene: [], girl: [], outfit: [], hair: [], pose: [] } as AssetsByCategory;
  for (const asset of assetList) {
    const category = asset.category as keyof AssetsByCategory;
    if (grouped[category]) grouped[category].push(asset);
  }
  return grouped;
}

function LocalAssetUploader(props: { onUpload: (category: keyof AssetsByCategory, files: FileList | null) => void }) {
  return (
    <div className="local-uploader">
      {(Object.keys(categoryLabels) as Array<keyof AssetsByCategory>).map((category) => (
        <label key={category}>
          上傳{categoryLabels[category]}
          <input type="file" accept="image/*" onChange={(event) => props.onUpload(category, event.target.files)} />
        </label>
      ))}
    </div>
  );
}

function AssetGrid(props: {
  assets: DriveAsset[];
  selectedId: string;
  onSelect: (id: string) => void;
  category?: keyof AssetsByCategory;
  onDelete?: (asset: DriveAsset) => void;
}) {
  if (!props.assets.length) {
    return (
      <div className="empty-state">
        <strong>未找到素材</strong>
        <span>請把圖片放入 Google Drive 對應資料夾，再按「同步 Google Drive 素材」。</span>
      </div>
    );
  }

  return (
    <div className="asset-grid">
      {props.assets.map((asset) => (
        <article
          className={`asset-card ${props.selectedId === asset.id ? "selected" : ""}`}
          key={asset.id || asset.google_drive_file_id}
          onClick={() => asset.id && props.onSelect(asset.id)}
        >
          {asset.thumbnail_url ? <img src={asset.thumbnail_url} alt={asset.file_name || "Drive 素材"} /> : <div className="image-placeholder">無預覽</div>}
          <div>
            <strong>{assetName(asset)}</strong>
            <span>{categoryLabels[(asset.category as keyof AssetsByCategory)] || props.category || asset.category} / {asset.source === "local" ? "本地" : "Drive"}</span>
            {asset.source === "local" && props.onDelete ? (
              <div className="card-actions">
                <button type="button" onClick={(event) => { event.stopPropagation(); props.onDelete?.(asset); }}>刪除本地素材</button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
