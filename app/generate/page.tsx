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
import { PRODUCTION_PRESET_KEY, ProductionPreset } from "@/lib/production-preset";
import {
  buildLocalManifest,
  deleteLocalAsset,
  downloadJson,
  importLocalManifest,
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

type FactorySettings = {
  targetImages: string;
  imagesPerJob: string;
  queueDelaySeconds: string;
  maxRetries: string;
  useReferenceAssets: boolean;
  randomizeCombinations: boolean;
  seed: string;
  extraPrompt: string;
};

type FactoryRecipe = {
  id: string;
  name: string;
  createdAt: string;
  settings: FactorySettings;
};

const FACTORY_RECIPES_KEY = "ai-girl-generator.factory-recipes";

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
  const [factory, setFactory] = useState<FactorySettings>({
    targetImages: "100",
    imagesPerJob: "4",
    queueDelaySeconds: "8",
    maxRetries: "2",
    useReferenceAssets: true,
    randomizeCombinations: true,
    seed: todaySeed(),
    extraPrompt: ""
  });
  const [factoryRecipeName, setFactoryRecipeName] = useState("每日 100 張");
  const [factoryRecipes, setFactoryRecipes] = useState<FactoryRecipe[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [sceneVariation, setSceneVariation] = useState<SceneVariation | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const queueRef = useRef<QueueJob[]>([]);
  const queueRunningRef = useRef(false);
  const queuePausedRef = useRef(false);
  const queueSaveChainRef = useRef(Promise.resolve());

  useEffect(() => {
    void fetchAssets().finally(() => loadPendingProductionPreset());
    restoreQueue();
    loadFactoryRecipes();
  }, []);

  async function restoreQueue() {
    try {
      const storedQueue = await loadLocalQueue();
      const normalizedQueue = storedQueue.map((job) => (
        job.status === "running"
          ? normalizeQueueJob({ ...job, status: "failed" as const, message: "頁面曾經重新載入，請按重試繼續。" })
          : normalizeQueueJob(job)
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

  function loadFactoryRecipes() {
    try {
      const raw = window.localStorage.getItem(FACTORY_RECIPES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setFactoryRecipes(parsed.map((recipe) => ({
          ...recipe,
          settings: normalizeFactorySettings(recipe.settings)
        })));
      }
    } catch {
      setFactoryRecipes([]);
    }
  }

  function loadPendingProductionPreset() {
    try {
      const raw = window.localStorage.getItem(PRODUCTION_PRESET_KEY);
      if (!raw) return;
      const preset = JSON.parse(raw) as ProductionPreset;
      window.localStorage.removeItem(PRODUCTION_PRESET_KEY);
      setForm((current) => ({
        ...current,
        girlStyle: preset.form.girlStyle || current.girlStyle,
        hairStyle: preset.form.hairStyle || current.hairStyle,
        hairColor: preset.form.hairColor || current.hairColor,
        outfit: preset.form.outfit || current.outfit,
        bodyType: preset.form.bodyType || current.bodyType,
        expression: preset.form.expression || current.expression,
        pose: preset.form.pose || current.pose
      }));
      setFactory((current) => ({
        ...current,
        seed: preset.factory.seed || current.seed,
        extraPrompt: [preset.factory.extraPrompt, current.extraPrompt].filter((value) => value?.trim()).join("\n")
      }));
      setFactoryRecipeName(preset.name);
      setStatus(`已由品質報表套用高保留率配方：${preset.name}。已審稿 ${preset.reviewed} 張，保留率 ${preset.keepRate}%。`);
    } catch {
      window.localStorage.removeItem(PRODUCTION_PRESET_KEY);
      setStatus("品質報表配方讀取失敗，已清除暫存。");
    }
  }

  function persistFactoryRecipes(next: FactoryRecipe[]) {
    setFactoryRecipes(next);
    window.localStorage.setItem(FACTORY_RECIPES_KEY, JSON.stringify(next));
  }

  function saveFactoryRecipe() {
    const name = factoryRecipeName.trim() || `生產配方 ${factoryRecipes.length + 1}`;
    const recipe: FactoryRecipe = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      settings: { ...factory }
    };
    persistFactoryRecipes([recipe, ...factoryRecipes.filter((item) => item.name !== name)]);
    setFactoryRecipeName(name);
    setStatus(`已保存批量生產配方：${name}`);
  }

  function loadFactoryRecipe(id: string) {
    const recipe = factoryRecipes.find((item) => item.id === id);
    if (!recipe) return;
    setFactory(normalizeFactorySettings(recipe.settings));
    setFactoryRecipeName(recipe.name);
    setStatus(`已套用批量生產配方：${recipe.name}`);
  }

  function deleteFactoryRecipe(id: string) {
    const recipe = factoryRecipes.find((item) => item.id === id);
    persistFactoryRecipes(factoryRecipes.filter((item) => item.id !== id));
    setStatus(recipe ? `已刪除批量生產配方：${recipe.name}` : "已刪除批量生產配方。");
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

  const queueStats = useMemo(() => {
    const totalJobs = queue.length;
    const pendingJobs = queue.filter((job) => job.status === "pending").length;
    const runningJobs = queue.filter((job) => job.status === "running").length;
    const doneJobs = queue.filter((job) => job.status === "done").length;
    const failedJobs = queue.filter((job) => job.status === "failed").length;
    const retriedJobs = queue.filter((job) => (job.attempts || 0) > 1).length;
    const retryBudget = queue
      .filter((job) => job.status !== "done")
      .reduce((sum, job) => sum + Math.max(0, (job.maxAttempts || 1) - (job.attempts || 0)), 0);
    const plannedImages = queue.reduce((sum, job) => sum + job.payload.count, 0);
    const doneImages = queue
      .filter((job) => job.status === "done")
      .reduce((sum, job) => sum + (job.results?.length || job.payload.count), 0);
    const successRate = totalJobs ? Math.round((doneJobs / totalJobs) * 100) : 0;
    return { totalJobs, pendingJobs, runningJobs, doneJobs, failedJobs, retriedJobs, retryBudget, plannedImages, doneImages, successRate };
  }, [queue]);

  const factoryReadiness = useMemo(() => {
    const targetImages = clampNumber(Number(factory.targetImages), 1, 500);
    const imagesPerJob = normalizeCount(Number(factory.imagesPerJob));
    const estimatedJobs = Math.ceil(targetImages / imagesPerJob);
    const delaySeconds = clampNumber(Number(factory.queueDelaySeconds), 0, 120);
    const maxRetries = clampNumber(Number(factory.maxRetries), 0, 5);
    const estimatedMinutes = Math.max(1, Math.ceil((estimatedJobs * (25 + delaySeconds)) / 60));
    const warnings: string[] = [];
    const strengths: string[] = [];

    if (!assets.scene.length) warnings.push("未有場景素材，不能建立批量列隊。");
    if (assets.scene.length > 0 && assets.scene.length < 5) warnings.push("場景少過 5 張，100 張成品會較容易重複。");
    if (factory.useReferenceAssets && !assets.girl.length) warnings.push("已勾選參考素材，但未有女仔參考圖。");
    if (factory.useReferenceAssets && !assets.outfit.length) warnings.push("已勾選參考素材，但未有衣服參考圖。");
    if (factory.useReferenceAssets && !assets.hair.length) warnings.push("已勾選參考素材，但未有髮型參考圖。");
    if (factory.useReferenceAssets && !assets.pose.length) warnings.push("已勾選參考素材，但未有姿勢參考圖。");
    if (delaySeconds < 5 && targetImages >= 50) warnings.push("任務間隔低過 5 秒，大量生成較易遇到 rate limit。");
    if (maxRetries === 0 && targetImages >= 50) warnings.push("大量生成建議至少 1-2 次自動重試。");

    if (assets.scene.length >= 8) strengths.push("場景素材足夠輪替。");
    if (!factory.useReferenceAssets || (assets.girl.length && assets.outfit.length && assets.hair.length && assets.pose.length)) {
      strengths.push("參考素材設定完整。");
    }
    if (delaySeconds >= 8) strengths.push("任務間隔較穩陣。");
    if (maxRetries >= 1) strengths.push("已有自動重試保護。");
    if (factory.seed.trim()) strengths.push("已設定 seed，方便復盤同重現。");

    return {
      targetImages,
      imagesPerJob,
      estimatedJobs,
      estimatedMinutes,
      maxRetries,
      delaySeconds,
      warnings,
      strengths,
      ready: assets.scene.length > 0 && warnings.length <= 2
    };
  }, [assets, factory]);

  const factoryPlan = useMemo(() => {
    const seed = factory.seed.trim() || todaySeed();
    const scenes = prepareFactoryList(assets.scene, seed, "scene", factory.randomizeCombinations);
    const girlStyles = prepareFactoryList(GIRL_STYLES, seed, "girl-style", factory.randomizeCombinations);
    const hairStyles = prepareFactoryList(HAIR_STYLES, seed, "hair-style", factory.randomizeCombinations);
    const hairColors = prepareFactoryList(HAIR_COLORS, seed, "hair-color", factory.randomizeCombinations);
    const outfits = prepareFactoryList(OUTFITS, seed, "outfit", factory.randomizeCombinations);
    const bodyTypes = prepareFactoryList(BODY_TYPES, seed, "body-type", factory.randomizeCombinations);
    const expressions = prepareFactoryList(EXPRESSIONS, seed, "expression", factory.randomizeCombinations);
    const poses = prepareFactoryList(POSES, seed, "pose", factory.randomizeCombinations);
    const targetImages = clampNumber(Number(factory.targetImages), 1, 500);
    const preferredCount = normalizeCount(Number(factory.imagesPerJob));
    const sceneCounts = new Map<string, { name: string; images: number; jobs: number }>();
    const samples: Array<{ index: number; scene: string; girlStyle: string; hairStyle: string; hairColor: string; outfit: string; bodyType: string; expression: string; pose: string; count: number }> = [];
    let remaining = targetImages;
    let index = 0;

    while (remaining > 0 && scenes.length) {
      const count = normalizeCount(Math.min(preferredCount, remaining));
      const scene = scenes[index % scenes.length];
      const sceneId = scene.id || scene.google_drive_file_id;
      const current = sceneCounts.get(sceneId) || { name: assetName(scene), images: 0, jobs: 0 };
      current.images += count;
      current.jobs += 1;
      sceneCounts.set(sceneId, current);

      if (samples.length < 8) {
        samples.push({
          index: index + 1,
          scene: assetName(scene),
          girlStyle: girlStyles[index % girlStyles.length],
          hairStyle: hairStyles[(index * 2 + 1) % hairStyles.length],
          hairColor: hairColors[(index * 3 + 2) % hairColors.length],
          outfit: outfits[(index * 5 + 1) % outfits.length],
          bodyType: bodyTypes[(index * 7 + 3) % bodyTypes.length],
          expression: expressions[(index * 2 + 4) % expressions.length],
          pose: poses[(index * 3 + 1) % poses.length],
          count
        });
      }

      remaining -= count;
      index += 1;
    }

    return {
      seed,
      targetImages,
      jobs: index,
      sceneCoverage: Array.from(sceneCounts.values()).sort((a, b) => b.images - a.images),
      samples
    };
  }, [assets.scene, factory.imagesPerJob, factory.randomizeCombinations, factory.seed, factory.targetImages]);

  function buildPayloadFromAssets(input: {
    scene: DriveAsset;
    girl?: DriveAsset;
    outfitAsset?: DriveAsset;
    hairAsset?: DriveAsset;
    poseAsset?: DriveAsset;
    girlStyle: string;
    hairStyle: string;
    hairColor: string;
    outfit: string;
    bodyType: string;
    expression: string;
    pose: string;
    count: 1 | 2 | 4;
    extraPrompt?: string;
  }) {
    const builtPayload: GeneratePayload = {
      sceneAssetId: input.scene.id || input.scene.google_drive_file_id,
      sceneDataUrl: input.scene.data_url || undefined,
      sceneFileName: input.scene.file_name || undefined,
      girlReferenceAssetId: input.girl?.id || undefined,
      girlReferenceDataUrl: input.girl?.data_url || undefined,
      girlReferenceFileName: input.girl?.file_name || undefined,
      outfitAssetId: input.outfitAsset?.id || undefined,
      outfitDataUrl: input.outfitAsset?.data_url || undefined,
      outfitFileName: input.outfitAsset?.file_name || undefined,
      hairAssetId: input.hairAsset?.id || undefined,
      hairDataUrl: input.hairAsset?.data_url || undefined,
      hairFileName: input.hairAsset?.file_name || undefined,
      poseAssetId: input.poseAsset?.id || undefined,
      poseDataUrl: input.poseAsset?.data_url || undefined,
      poseFileName: input.poseAsset?.file_name || undefined,
      girlStyle: input.girlStyle,
      hairStyle: input.hairStyle,
      hairColor: input.hairColor,
      outfit: input.outfit,
      bodyType: input.bodyType,
      expression: input.expression,
      pose: input.pose,
      extraPrompt: input.extraPrompt,
      count: input.count
    };
    const builtAssets = [input.scene, input.girl, input.outfitAsset, input.hairAsset, input.poseAsset].filter(Boolean) as DriveAsset[];
    return { payload: builtPayload, assets: builtAssets };
  }

  function makeQueueJob(input: { label: string; payload: GeneratePayload; assets: DriveAsset[]; message?: string }): QueueJob {
    const maxAttempts = 1 + clampNumber(Number(factory.maxRetries), 0, 5);
    return {
      id: crypto.randomUUID(),
      label: input.label,
      payload: input.payload,
      assets: input.assets,
      status: "pending",
      message: input.message || "等待生成",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts,
      lastError: ""
    };
  }

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
    const job = makeQueueJob({
      label: `${sceneLabel} / ${label(form.girlStyle)} / ${label(form.outfit)} / ${form.count} 張`,
      payload: { ...payload },
      assets: [...selectedAssets]
    });
    updateQueue((current) => [job, ...current]);
    setStatus("已加入列隊。你可以繼續改設定再加入下一個任務。");
  }

  function enqueueFactoryBatch(autoStart = false) {
    const seed = factory.seed.trim() || todaySeed();
    const scenes = prepareFactoryList(assets.scene, seed, "scene", factory.randomizeCombinations);
    if (!scenes.length) {
      setStatus("批量生產需要至少一張場景圖。請先同步 Google Drive 素材或上傳本地場景。");
      return;
    }
    const girls = prepareFactoryList(assets.girl, seed, "girl", factory.randomizeCombinations);
    const outfitAssets = prepareFactoryList(assets.outfit, seed, "outfit-asset", factory.randomizeCombinations);
    const hairAssets = prepareFactoryList(assets.hair, seed, "hair-asset", factory.randomizeCombinations);
    const poseAssets = prepareFactoryList(assets.pose, seed, "pose-asset", factory.randomizeCombinations);
    const girlStyles = prepareFactoryList(GIRL_STYLES, seed, "girl-style", factory.randomizeCombinations);
    const hairStyles = prepareFactoryList(HAIR_STYLES, seed, "hair-style", factory.randomizeCombinations);
    const hairColors = prepareFactoryList(HAIR_COLORS, seed, "hair-color", factory.randomizeCombinations);
    const outfits = prepareFactoryList(OUTFITS, seed, "outfit", factory.randomizeCombinations);
    const bodyTypes = prepareFactoryList(BODY_TYPES, seed, "body-type", factory.randomizeCombinations);
    const expressions = prepareFactoryList(EXPRESSIONS, seed, "expression", factory.randomizeCombinations);
    const poses = prepareFactoryList(POSES, seed, "pose", factory.randomizeCombinations);

    const targetImages = clampNumber(Number(factory.targetImages), 1, 500);
    const preferredCount = normalizeCount(Number(factory.imagesPerJob));
    const jobs: QueueJob[] = [];
    let remaining = targetImages;
    let index = 0;

    while (remaining > 0) {
      const count = normalizeCount(Math.min(preferredCount, remaining));
      const scene = scenes[index % scenes.length];
      const girl = factory.useReferenceAssets ? pickOptional(girls, index) : undefined;
      const outfitAsset = factory.useReferenceAssets ? pickOptional(outfitAssets, index + 1) : undefined;
      const hairAsset = factory.useReferenceAssets ? pickOptional(hairAssets, index + 2) : undefined;
      const poseAsset = factory.useReferenceAssets ? pickOptional(poseAssets, index + 3) : undefined;
      const girlStyle = girlStyles[index % girlStyles.length];
      const hairStyle = hairStyles[(index * 2 + 1) % hairStyles.length];
      const hairColor = hairColors[(index * 3 + 2) % hairColors.length];
      const outfit = outfits[(index * 5 + 1) % outfits.length];
      const bodyType = bodyTypes[(index * 7 + 3) % bodyTypes.length];
      const expression = expressions[(index * 2 + 4) % expressions.length];
      const pose = poses[(index * 3 + 1) % poses.length];
      const extraPrompt = [form.extraPrompt, factory.extraPrompt, `Batch production variation ${index + 1}: keep this result visually distinct from the previous generated images.`]
        .filter((value) => value.trim())
        .join("\n");

      const built = buildPayloadFromAssets({
        scene,
        girl,
        outfitAsset,
        hairAsset,
        poseAsset,
        girlStyle,
        hairStyle,
        hairColor,
        outfit,
        bodyType,
        expression,
        pose,
        count,
        extraPrompt
      });

      jobs.push(makeQueueJob({
        label: `批量 ${index + 1}: ${assetName(scene)} / ${label(girlStyle)} / ${label(outfit)} / ${count} 張`,
        payload: built.payload,
        assets: built.assets,
        message: "批量生產等待生成"
      }));

      remaining -= count;
      index += 1;
    }

    updateQueue((current) => [...jobs, ...current]);
    setStatus(`已建立 ${jobs.length} 個批量任務，目標約 ${targetImages} 張。Seed：${seed}。${autoStart ? "列隊即將開始。" : "可按「開始列隊」生產。"}`);
    if (autoStart) window.setTimeout(() => void processQueue(), 50);
  }

  async function processQueue() {
    if (queueRunningRef.current) return;
    queuePausedRef.current = false;
    setQueuePaused(false);
    queueRunningRef.current = true;
    setQueueRunning(true);
    setStatus("列隊開始處理，會逐個任務生成，減少 rate limit 風險。");
    try {
      while (true) {
        if (queuePausedRef.current) {
          setStatus("列隊已暫停。當前任務已完成後停止，按「繼續列隊」可再開始。");
          break;
        }
        const job = queueRef.current.find((item) => item.status === "pending");
        if (!job) break;
        const attemptNumber = (job.attempts || 0) + 1;
        const maxAttempts = Math.max(1, job.maxAttempts || 3);
        updateQueue((current) => current.map((item) => item.id === job.id ? {
          ...item,
          status: "running",
          attempts: attemptNumber,
          maxAttempts,
          startedAt: new Date().toISOString(),
          message: `生成中，第 ${attemptNumber}/${maxAttempts} 次嘗試...`
        } : item));
        try {
          const generated = await runGenerationPayload(job.payload, job.assets);
          setResults(generated.images);
          updateQueue((current) => current.map((item) => (
            item.id === job.id
              ? {
                ...item,
                status: "done",
                message: `完成 ${generated.images.length} 張。${generated.warning}`.trim(),
                finishedAt: new Date().toISOString(),
                lastError: "",
                results: generated.images
              }
              : item
          )));
          if (queueRef.current.some((item) => item.status === "pending")) {
            const seconds = clampNumber(Number(factory.queueDelaySeconds), 0, 120);
            if (seconds > 0) {
              setStatus(`上一個任務已完成，等待 ${seconds} 秒後繼續下一個任務。`);
              await delay(seconds * 1000);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "生成失敗。";
          const shouldRetry = attemptNumber < maxAttempts;
          updateQueue((current) => current.map((item) => item.id === job.id ? {
            ...item,
            status: shouldRetry ? "pending" : "failed",
            message: shouldRetry
              ? `失敗，會自動重試第 ${attemptNumber + 1}/${maxAttempts} 次：${message}`
              : `已達重試上限：${message}`,
            finishedAt: shouldRetry ? undefined : new Date().toISOString(),
            lastError: message
          } : item));
          if (shouldRetry) {
            const seconds = clampNumber(Number(factory.queueDelaySeconds), 0, 120);
            if (seconds > 0) {
              setStatus(`任務失敗，等待 ${seconds} 秒後自動重試。`);
              await delay(seconds * 1000);
            }
          }
        }
      }
      const failed = queueRef.current.filter((item) => item.status === "failed").length;
      const done = queueRef.current.filter((item) => item.status === "done").length;
      setStatus(`列隊已處理完成：完成 ${done} 個任務，失敗 ${failed} 個任務。可匯出生產報告留底。`);
    } finally {
      queueRunningRef.current = false;
      setQueueRunning(false);
    }
  }

  function pauseQueue() {
    queuePausedRef.current = true;
    setQueuePaused(true);
    setStatus("已要求暫停；目前任務完成後會停止。");
  }

  function resumeQueue() {
    queuePausedRef.current = false;
    setQueuePaused(false);
    void processQueue();
  }

  function retryQueueJob(id: string) {
    updateQueue((current) => current.map((item) => item.id === id ? {
      ...item,
      status: "pending",
      attempts: 0,
      maxAttempts: Math.max(1, item.maxAttempts || 1 + clampNumber(Number(factory.maxRetries), 0, 5)),
      message: "等待手動重試",
      lastError: item.lastError || ""
    } : item));
    void processQueue();
  }

  function retryAllFailedJobs() {
    updateQueue((current) => current.map((item) => item.status === "failed" ? {
      ...item,
      status: "pending",
      attempts: 0,
      maxAttempts: Math.max(1, item.maxAttempts || 1 + clampNumber(Number(factory.maxRetries), 0, 5)),
      message: "等待批量重試"
    } : item));
    setStatus("已把所有失敗任務放回等待中。");
  }

  function exportQueueReport() {
    const report = {
      version: 1,
      exported_at: new Date().toISOString(),
      summary: queueStats,
      settings: {
        queueDelaySeconds: factory.queueDelaySeconds,
        maxRetries: factory.maxRetries,
        seed: factory.seed,
        targetImages: factory.targetImages,
        imagesPerJob: factory.imagesPerJob
      },
      jobs: queue.map((job) => ({
        id: job.id,
        label: job.label,
        status: job.status,
        message: job.message,
        attempts: job.attempts || 0,
        maxAttempts: job.maxAttempts || 1,
        plannedImages: job.payload.count,
        generatedImages: job.results?.length || 0,
        lastError: job.lastError || "",
        createdAt: job.createdAt,
        startedAt: job.startedAt || "",
        finishedAt: job.finishedAt || "",
        payload: job.payload
      }))
    };
    downloadJson(report, `production-report_${new Date().toISOString().slice(0, 10)}.json`);
  }

  function exportFactoryPlan() {
    downloadJson({
      version: 1,
      exported_at: new Date().toISOString(),
      settings: {
        targetImages: factory.targetImages,
        imagesPerJob: factory.imagesPerJob,
        queueDelaySeconds: factory.queueDelaySeconds,
        maxRetries: factory.maxRetries,
        seed: factoryPlan.seed,
        useReferenceAssets: factory.useReferenceAssets,
        randomizeCombinations: factory.randomizeCombinations
      },
      readiness: factoryReadiness,
      plan: factoryPlan
    }, `production-plan_${new Date().toISOString().slice(0, 10)}.json`);
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

  async function importManifest(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      setStatus("正在匯入素材包...");
      const text = await file.text();
      const manifest = JSON.parse(text);
      const summary = await importLocalManifest(manifest);
      await fetchAssets();
      await restoreQueue();
      setStatus(`匯入完成：素材 ${summary.assets}、圖片 ${summary.images}、批次 ${summary.batches}、列隊 ${summary.queue}。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "匯入素材包失敗。");
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
          <ManifestTools onImport={importManifest} onExport={exportManifest} />
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
          <div className="factory-panel">
            <div>
              <strong>批量生產工廠</strong>
              <p className="muted">用現有場景和設定自動組合大量任務；適合一天 100 張以上的生產流。Gallery 的品質報表可把高保留率組合套用到這裡。</p>
            </div>
            <div className={`readiness-panel ${factoryReadiness.ready ? "ready" : "warning"}`}>
              <div className="readiness-heading">
                <strong>{factoryReadiness.ready ? "生產前檢查：可以開工" : "生產前檢查：需要留意"}</strong>
                <span>約 {factoryReadiness.estimatedJobs} 個任務 / {factoryReadiness.targetImages} 張 / 約 {factoryReadiness.estimatedMinutes} 分鐘</span>
              </div>
              <div className="readiness-stats">
                <span>場景 {assets.scene.length}</span>
                <span>女仔 {assets.girl.length}</span>
                <span>衣服 {assets.outfit.length}</span>
                <span>髮型 {assets.hair.length}</span>
                <span>姿勢 {assets.pose.length}</span>
                <span>每任務 {factoryReadiness.imagesPerJob} 張</span>
                <span>間隔 {factoryReadiness.delaySeconds} 秒</span>
                <span>重試 {factoryReadiness.maxRetries} 次</span>
              </div>
              {factoryReadiness.warnings.length ? (
                <div className="readiness-list warning">
                  {factoryReadiness.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                </div>
              ) : null}
              {factoryReadiness.strengths.length ? (
                <div className="readiness-list ready">
                  {factoryReadiness.strengths.map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : null}
            </div>
            <div className="production-plan">
              <div className="readiness-heading">
                <strong>生產計劃</strong>
                <span>Seed：{factoryPlan.seed} / {factoryPlan.jobs} 個任務</span>
              </div>
              <div className="plan-grid">
                <div>
                  <strong>場景覆蓋</strong>
                  {factoryPlan.sceneCoverage.length ? (
                    <div className="plan-list">
                      {factoryPlan.sceneCoverage.slice(0, 6).map((scene) => (
                        <span key={scene.name}>{scene.name}：{scene.images} 張 / {scene.jobs} 任務</span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">未有場景可計劃。</p>
                  )}
                </div>
                <div>
                  <strong>前 8 個任務樣本</strong>
                  {factoryPlan.samples.length ? (
                    <div className="plan-list">
                      {factoryPlan.samples.map((sample) => (
                        <span key={sample.index}>
                          #{sample.index} {sample.scene} / {label(sample.girlStyle)} / {label(sample.outfit)} / {label(sample.pose)} / {sample.count} 張
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">未有任務樣本。</p>
                  )}
                </div>
              </div>
              <div className="card-actions">
                <button type="button" onClick={exportFactoryPlan} disabled={!factoryPlan.jobs}>匯出生產計劃</button>
              </div>
            </div>
            <div className="recipe-tools">
              <label>
                生產配方名稱
                <input
                  value={factoryRecipeName}
                  placeholder="例如：每日 100 張街拍"
                  onChange={(event) => setFactoryRecipeName(event.target.value)}
                />
              </label>
              <button type="button" onClick={saveFactoryRecipe}>保存配方</button>
              <label>
                套用已保存配方
                <select value="" onChange={(event) => loadFactoryRecipe(event.target.value)}>
                  <option value="">選擇配方</option>
                  {factoryRecipes.map((recipe) => (
                    <option value={recipe.id} key={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => deleteFactoryRecipe(factoryRecipes.find((recipe) => recipe.name === factoryRecipeName)?.id || "")}
                disabled={!factoryRecipes.some((recipe) => recipe.name === factoryRecipeName)}
              >
                刪除目前配方
              </button>
            </div>
            <div className="controls-grid">
              <label>
                目標張數
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={factory.targetImages}
                  onChange={(event) => setFactory({ ...factory, targetImages: event.target.value })}
                />
              </label>
              <label>
                每任務張數
                <select
                  value={factory.imagesPerJob}
                  onChange={(event) => setFactory({ ...factory, imagesPerJob: event.target.value })}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                </select>
              </label>
              <label>
                任務間隔秒數
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={factory.queueDelaySeconds}
                  onChange={(event) => setFactory({ ...factory, queueDelaySeconds: event.target.value })}
                />
              </label>
              <label>
                自動重試次數
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={factory.maxRetries}
                  onChange={(event) => setFactory({ ...factory, maxRetries: event.target.value })}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={factory.useReferenceAssets}
                  onChange={(event) => setFactory({ ...factory, useReferenceAssets: event.target.checked })}
                />
                使用女仔/衣服/髮型/姿勢參考素材
              </label>
              <label>
                生產 seed
                <input
                  value={factory.seed}
                  placeholder="例如：daily-2026-06-06"
                  onChange={(event) => setFactory({ ...factory, seed: event.target.value })}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={factory.randomizeCombinations}
                  onChange={(event) => setFactory({ ...factory, randomizeCombinations: event.target.checked })}
                />
                用 seed 隨機化組合
              </label>
            </div>
            <div className="card-actions">
              <button type="button" onClick={() => setFactory({ ...factory, seed: todaySeed() })}>使用今日 seed</button>
              <button type="button" onClick={() => setFactory({ ...factory, seed: `batch-${Date.now()}` })}>生成新 seed</button>
            </div>
            <label>
              批量額外 prompt
              <textarea
                value={factory.extraPrompt}
                placeholder="例如：每張都要不同街拍構圖、不同光線、不同鏡頭距離"
                onChange={(event) => setFactory({ ...factory, extraPrompt: event.target.value })}
              />
            </label>
            <div className="card-actions">
              <button type="button" onClick={() => enqueueFactoryBatch(false)} disabled={!assets.scene.length}>
                建立批量列隊
              </button>
              <button type="button" onClick={() => enqueueFactoryBatch(true)} disabled={!assets.scene.length || queueRunning}>
                建立並開始
              </button>
            </div>
          </div>
          <button className="primary" onClick={generate} disabled={generating || !selectedScene}>
            {generating ? "生成中..." : `生成 ${form.count} 張圖片`}
          </button>
          <div className="queue-panel">
            <div>
              <strong>生成列隊</strong>
              <p className="muted">適合一次排幾組場景/造型，系統會逐個生成；列隊會保存在本機，刷新後仍可重試未完成任務。</p>
            </div>
            <div className="queue-stats">
              <span>任務：{queueStats.totalJobs}</span>
              <span>等待：{queueStats.pendingJobs}</span>
              <span>生成中：{queueStats.runningJobs}</span>
              <span>完成：{queueStats.doneJobs}</span>
              <span>失敗：{queueStats.failedJobs}</span>
              <span>圖片：{queueStats.doneImages}/{queueStats.plannedImages}</span>
              <span>重試任務：{queueStats.retriedJobs}</span>
              <span>剩餘重試：{queueStats.retryBudget}</span>
              <span>成功率：{queueStats.successRate}%</span>
            </div>
            <div className="card-actions">
              <button type="button" onClick={enqueueCurrent} disabled={!selectedScene}>加入列隊</button>
              <button type="button" onClick={processQueue} disabled={queueRunning || !queue.some((job) => job.status === "pending")}>
                {queueRunning ? "列隊處理中..." : "開始列隊"}
              </button>
              <button type="button" onClick={pauseQueue} disabled={!queueRunning || queuePaused}>暫停</button>
              <button type="button" onClick={resumeQueue} disabled={queueRunning || !queue.some((job) => job.status === "pending")}>繼續列隊</button>
              <button type="button" onClick={retryAllFailedJobs} disabled={!queue.some((job) => job.status === "failed")}>重試全部失敗</button>
              <button type="button" onClick={clearFinishedQueueJobs} disabled={!queue.some((job) => job.status === "done")}>清走完成</button>
              <button type="button" onClick={clearQueue} disabled={!queue.some((job) => job.status !== "running")}>清空列隊</button>
              <button type="button" onClick={exportQueueReport} disabled={!queue.length}>匯出生產報告</button>
            </div>
            {queue.length ? (
              <div className="queue-list">
                {queue.map((job) => (
                  <article className={`queue-item ${job.status}`} key={job.id}>
                    <div>
                      <strong>{job.label}</strong>
                      <span>{queueStatusLabel(job.status)} / {job.message}</span>
                      <span>嘗試：{job.attempts || 0}/{job.maxAttempts || 1} / 建立：{new Date(job.createdAt).toLocaleString("zh-HK")}</span>
                      {job.lastError ? <span className="error-text">最後錯誤：{job.lastError}</span> : null}
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

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeCount(value: number): 1 | 2 | 4 {
  if (value >= 4) return 4;
  if (value >= 2) return 2;
  return 1;
}

function pickOptional<T>(items: T[], index: number) {
  return items.length ? items[index % items.length] : undefined;
}

function normalizeFactorySettings(settings: Partial<FactorySettings> = {}): FactorySettings {
  return {
    targetImages: settings.targetImages || "100",
    imagesPerJob: settings.imagesPerJob || "4",
    queueDelaySeconds: settings.queueDelaySeconds || "8",
    maxRetries: settings.maxRetries || "2",
    useReferenceAssets: settings.useReferenceAssets ?? true,
    randomizeCombinations: settings.randomizeCombinations ?? true,
    seed: settings.seed || todaySeed(),
    extraPrompt: settings.extraPrompt || ""
  };
}

function normalizeQueueJob(job: QueueJob): QueueJob {
  const attempts = Number.isFinite(job.attempts) ? Number(job.attempts) : 0;
  const maxAttempts = Number.isFinite(job.maxAttempts) ? Number(job.maxAttempts) : 3;
  return {
    ...job,
    attempts,
    maxAttempts: Math.max(1, maxAttempts),
    lastError: job.lastError || ""
  };
}

function todaySeed() {
  return `daily-${new Date().toISOString().slice(0, 10)}`;
}

function prepareFactoryList<T>(items: T[], seed: string, salt: string, randomize: boolean) {
  return randomize ? seededShuffle(items, `${seed}:${salt}`) : [...items];
}

function seededShuffle<T>(items: T[], seed: string) {
  const next = [...items];
  const random = mulberry32(hashString(seed));
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function ManifestTools(props: { onImport: (files: FileList | null) => void; onExport: () => void }) {
  return (
    <div className="manifest-tools">
      <label>
        匯入素材包 JSON
        <input type="file" accept="application/json,.json" onChange={(event) => props.onImport(event.target.files)} />
      </label>
      <button type="button" onClick={props.onExport}>匯出素材包 JSON</button>
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
