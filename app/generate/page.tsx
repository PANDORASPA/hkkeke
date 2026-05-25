"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BODY_TYPES,
  EXPRESSIONS,
  GIRL_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  POSES
} from "@/lib/options";
import { DriveAsset, GeneratedImage } from "@/lib/types";

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

export default function GeneratePage() {
  const [assets, setAssets] = useState<AssetsByCategory>(emptyAssets);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [status, setStatus] = useState("Loading Google Drive assets...");
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
    setStatus("Syncing Google Drive assets...");
    try {
      const response = await fetch("/api/drive/assets");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to load assets.");
      const grouped = { ...emptyAssets } as AssetsByCategory;
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
      setStatus(`Loaded ${json.assets.length} Google Drive assets.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load assets.");
    } finally {
      setLoadingAssets(false);
    }
  }

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
      setStatus("Please select a scene first.");
      return;
    }

    setGenerating(true);
    setStatus("Generating image...");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          count: Number(form.count)
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Generation failed.");
      setResults(json.images);
      setStatus(`Generated ${json.images.length} image(s).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="page">
      <h1>Generate</h1>
      <div className="generate-layout">
        <section className="panel">
          <h2>Scene Library</h2>
          <button onClick={fetchAssets} disabled={loadingAssets}>
            Refresh Drive Assets
          </button>
          <p className="muted">{status}</p>
          <AssetGrid assets={assets.scene} selectedId={selectedScene} onSelect={setSelectedScene} />
        </section>

        <section className="panel">
          <h2>Options</h2>
          <div className="controls-grid">
            <Select label="Girl Style" value={form.girlStyle} options={GIRL_STYLES} onChange={(girlStyle) => setForm({ ...form, girlStyle })} />
            <Select label="Hair Style" value={form.hairStyle} options={HAIR_STYLES} onChange={(hairStyle) => setForm({ ...form, hairStyle })} />
            <Select label="Hair Color" value={form.hairColor} options={HAIR_COLORS} onChange={(hairColor) => setForm({ ...form, hairColor })} />
            <Select label="Outfit" value={form.outfit} options={OUTFITS} onChange={(outfit) => setForm({ ...form, outfit })} />
            <Select label="Body Type" value={form.bodyType} options={BODY_TYPES} onChange={(bodyType) => setForm({ ...form, bodyType })} />
            <Select label="Expression" value={form.expression} options={EXPRESSIONS} onChange={(expression) => setForm({ ...form, expression })} />
            <Select label="Pose" value={form.pose} options={POSES} onChange={(pose) => setForm({ ...form, pose })} />
            <Select label="Generate Count" value={form.count} options={["1", "2", "4"]} onChange={(count) => setForm({ ...form, count })} />
          </div>
          <label>
            Extra Prompt
            <textarea value={form.extraPrompt} onChange={(event) => setForm({ ...form, extraPrompt: event.target.value })} />
          </label>
          <label>
            Girl Reference
            <select value={selectedGirl} onChange={(event) => setSelectedGirl(event.target.value)}>
              <option value="">None</option>
              {assets.girl.map((asset) => <option key={asset.id} value={asset.id}>{asset.sub_category || asset.file_name}</option>)}
            </select>
          </label>
          <label>
            Outfit Reference
            <select value={selectedOutfitAsset} onChange={(event) => setSelectedOutfitAsset(event.target.value)}>
              <option value="">None</option>
              {assets.outfit.map((asset) => <option key={asset.id} value={asset.id}>{asset.sub_category || asset.file_name}</option>)}
            </select>
          </label>
          <label>
            Hair Reference
            <select value={selectedHairAsset} onChange={(event) => setSelectedHairAsset(event.target.value)}>
              <option value="">None</option>
              {assets.hair.map((asset) => <option key={asset.id} value={asset.id}>{asset.sub_category || asset.file_name}</option>)}
            </select>
          </label>
          <label>
            Pose Reference
            <select value={selectedPoseAsset} onChange={(event) => setSelectedPoseAsset(event.target.value)}>
              <option value="">None</option>
              {assets.pose.map((asset) => <option key={asset.id} value={asset.id}>{asset.sub_category || asset.file_name}</option>)}
            </select>
          </label>
        </section>

        <section className="panel">
          <h2>Selected Assets</h2>
          <AssetGrid assets={selectedAssets} selectedId="" onSelect={() => undefined} />
          <button className="primary" onClick={generate} disabled={generating || !selectedScene}>
            {generating ? "Generating..." : "Generate"}
          </button>
          <h2>Generated Result</h2>
          <div className="result-grid">
            {results.map((image) => (
              <article className="image-card" key={image.id}>
                {image.thumbnail_url ? <img src={image.thumbnail_url} alt="Generated image" /> : null}
                <div>
                  <strong>{image.girl_style}</strong>
                  <span>{image.prompt}</span>
                  {image.google_drive_url ? <a href={image.google_drive_url} target="_blank">Google Drive</a> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Select(props: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      {props.label}
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AssetGrid(props: { assets: DriveAsset[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!props.assets.length) return <p className="muted">No assets found.</p>;

  return (
    <div className="asset-grid">
      {props.assets.map((asset) => (
        <article
          className={`asset-card ${props.selectedId === asset.id ? "selected" : ""}`}
          key={asset.id || asset.google_drive_file_id}
          onClick={() => asset.id && props.onSelect(asset.id)}
        >
          {asset.thumbnail_url ? <img src={asset.thumbnail_url} alt={asset.file_name || "Drive asset"} /> : null}
          <div>
            <strong>{asset.sub_category || asset.file_name}</strong>
            <span>{asset.category} / {asset.mime_type}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
