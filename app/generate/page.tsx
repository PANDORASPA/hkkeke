"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DriveAsset, GeneratedImage, GeneratePayload } from "@/lib/types";

type AssetsByCategory = {
  scene: DriveAsset[];
  girl: DriveAsset[];
  outfit: DriveAsset[];
  hair: DriveAsset[];
  pose: DriveAsset[];
};

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
  const [results, setResults] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    setLoadingAssets(true);
    setStatus("正在同步 Google Drive 素材...");
    try {
      const response = await fetch("/api/drive/assets");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "讀取素材失敗。");
      const grouped = { scene: [], girl: [], outfit: [], hair: [], pose: [] } as AssetsByCategory;
      for (const asset of json.assets as DriveAsset[]) {
        const category = asset.category as keyof AssetsByCategory;
        if (grouped[category]) grouped[category].push(asset);
      }
      setAssets(grouped);
      setSelectedScene(grouped.scene[0]?.id || "");
      setSelectedGirl(grouped.girl[0]?.id || "");
      setSelectedOutfitAsset(grouped.outfit[0]?.id || "");
      setSelectedHairAsset(grouped.hair[0]?.id || "");
      setSelectedPoseAsset(grouped.pose[0]?.id || "");
      const syncMessage = json.sync?.ok === false ? `（Supabase 同步提示：${json.sync.message}）` : "";
      setStatus(`已同步 ${json.assets.length} 張素材。${syncMessage}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "讀取素材失敗。");
    } finally {
      setLoadingAssets(false);
    }
  }

  const payload: GeneratePayload = useMemo(() => ({
    sceneAssetId: selectedScene,
    girlReferenceAssetId: selectedGirl || undefined,
    outfitAssetId: selectedOutfitAsset || undefined,
    hairAssetId: selectedHairAsset || undefined,
    poseAssetId: selectedPoseAsset || undefined,
    girlStyle: form.girlStyle,
    hairStyle: form.hairStyle,
    hairColor: form.hairColor,
    outfit: form.outfit,
    bodyType: form.bodyType,
    expression: form.expression,
    pose: form.pose,
    extraPrompt: form.extraPrompt,
    count: Number(form.count) as 1 | 2 | 4
  }), [form, selectedGirl, selectedHairAsset, selectedOutfitAsset, selectedPoseAsset, selectedScene]);

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

  async function generate() {
    if (!selectedScene) {
      setStatus("請先選擇一張場景圖。把圖片放入 Google Drive 的 01_Scenes_場景 後，按「同步素材」。");
      return;
    }

    setGenerating(true);
    setResults([]);
    setStatus("正在生成圖片，請等候...");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "生成失敗。");
      setResults(json.images);
      setStatus(`完成生成 ${json.images.length} 張圖片，已自動上傳到 Google Drive 並寫入 Supabase。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "生成失敗。");
    } finally {
      setGenerating(false);
    }
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
          <AssetGrid assets={assets.scene} selectedId={selectedScene} onSelect={setSelectedScene} category="scene" />
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
          <AssetGrid assets={selectedAssets} selectedId="" onSelect={() => undefined} />
          <button className="primary" onClick={generate} disabled={generating || !selectedScene}>
            {generating ? "生成中..." : `生成 ${form.count} 張圖片`}
          </button>
          <div className="prompt-preview">
            <strong>Prompt 預覽</strong>
            <pre>{promptPreview}</pre>
          </div>
          <h2>生成結果</h2>
          <div className="result-grid">
            {results.map((image) => (
              <article className="image-card" key={image.id}>
                {image.thumbnail_url ? <img src={image.thumbnail_url} alt="生成圖片" /> : null}
                <div>
                  <strong>{label(image.girl_style)} / {label(image.outfit)}</strong>
                  <span>{image.prompt}</span>
                  <div className="card-actions">
                    {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive</a> : null}
                    <a href={`/api/generated/${image.id}/download`}>下載</a>
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

function AssetGrid(props: { assets: DriveAsset[]; selectedId: string; onSelect: (id: string) => void; category?: keyof AssetsByCategory }) {
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
            <span>{categoryLabels[(asset.category as keyof AssetsByCategory)] || props.category || asset.category}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
