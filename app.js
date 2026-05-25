const libraries = {
  scenes: [
    ["central-pier", "中環碼頭", "Central Pier, Hong Kong waterfront, soft daylight, cinematic city background"],
    ["tsim-sha-tsui", "尖沙咀海旁", "Tsim Sha Tsui promenade, Victoria Harbour skyline, editorial street photo"],
    ["hair-salon", "髮型屋", "modern Hong Kong hair salon, mirror lights, premium styling chair"],
    ["home-selfie", "家居自拍", "cozy apartment selfie corner, natural window light"],
    ["night-street", "夜景街拍", "Hong Kong neon night street, wet pavement, realistic urban glow"],
    ["ad-studio", "廣告場景", "clean commercial beauty studio, campaign lighting, polished set"]
  ],
  outfits: [
    ["ol", "OL", "tailored office blouse and pencil skirt, elegant business styling"],
    ["glam", "性感", "tasteful fitted evening outfit, confident fashion editorial look, non-explicit"],
    ["japanese", "日系", "Japanese casual fashion, soft cardigan, pleated skirt, gentle styling"],
    ["pajamas", "睡衣", "silky pajama set, relaxed indoor lifestyle look, non-explicit"],
    ["swimwear", "泳衣", "stylish swimwear with cover-up, resort campaign styling, non-explicit"],
    ["salon-uniform", "髮型屋制服", "minimal hair salon uniform, black apron, polished professional look"],
    ["ad-outfit", "廣告服裝", "beauty brand campaign outfit, clean lines, premium texture"]
  ],
  moods: [
    ["sweet", "甜美", "sweet smile, approachable and warm"],
    ["confident", "自信", "confident gaze, poised body language"],
    ["cool", "高冷", "cool expression, calm and cinematic"],
    ["playful", "俏皮", "playful expression, lively eyes"],
    ["soft", "溫柔", "soft expression, relaxed natural mood"]
  ],
  styles: [
    ["iphone", "手機寫真", "shot on iPhone, realistic social media photo, natural skin texture"],
    ["editorial", "雜誌感", "fashion editorial photography, refined composition, high-end retouching"],
    ["ugc", "UGC 自拍", "authentic creator selfie, casual framing, social media ready"],
    ["ad", "廣告大片", "commercial beauty advertising, crisp lighting, premium finish"],
    ["film", "菲林街拍", "35mm film street photography, natural grain, candid moment"]
  ],
  poses: [
    ["front-smile", "正面微笑", "front-facing half body portrait, gentle smile, direct eye contact"],
    ["side-look", "側身回望", "three-quarter side pose, looking back over shoulder"],
    ["hair-touch", "撥頭髮", "one hand touching hair, relaxed beauty pose"],
    ["walking", "自然行路", "walking pose, candid mid-step, natural movement"],
    ["seated", "坐姿", "seated pose, elegant posture, hands relaxed"],
    ["mirror", "鏡前自拍", "mirror selfie pose, phone visible, casual composition"],
    ["closeup", "近鏡頭像", "close-up beauty portrait, eyes sharp, soft background"],
    ["lean-wall", "靠牆", "leaning lightly against wall, editorial street pose"],
    ["looking-down", "低頭淺笑", "looking down with subtle smile, soft candid mood"],
    ["hand-waist", "手叉腰", "hand on waist pose, confident posture"]
  ]
};

const elements = {
  referenceUpload: document.querySelector("#referenceUpload"),
  referencePreview: document.querySelector("#referencePreview"),
  uploadBox: document.querySelector(".upload-box"),
  characterId: document.querySelector("#characterId"),
  characterDescription: document.querySelector("#characterDescription"),
  consistencyNotes: document.querySelector("#consistencyNotes"),
  apiKey: document.querySelector("#apiKey"),
  googleClientId: document.querySelector("#googleClientId"),
  modelSelect: document.querySelector("#modelSelect"),
  qualitySelect: document.querySelector("#qualitySelect"),
  sizeSelect: document.querySelector("#sizeSelect"),
  countSelect: document.querySelector("#countSelect"),
  adultConfirm: document.querySelector("#adultConfirm"),
  sourceModeSelect: document.querySelector("#sourceModeSelect"),
  characterSelect: document.querySelector("#characterSelect"),
  characterImageSelect: document.querySelector("#characterImageSelect"),
  sceneSelect: document.querySelector("#sceneSelect"),
  outfitSelect: document.querySelector("#outfitSelect"),
  moodSelect: document.querySelector("#moodSelect"),
  styleSelect: document.querySelector("#styleSelect"),
  runStatus: document.querySelector("#runStatus"),
  runMeta: document.querySelector("#runMeta"),
  progressBar: document.querySelector("#progressBar"),
  preflightList: document.querySelector("#preflightList"),
  poseGrid: document.querySelector("#poseGrid"),
  poseCountLabel: document.querySelector("#poseCountLabel"),
  promptOutput: document.querySelector("#promptOutput"),
  captionOutput: document.querySelector("#captionOutput"),
  resultGrid: document.querySelector("#resultGrid"),
  contactSheetWrap: document.querySelector("#contactSheetWrap"),
  contactSheetCanvas: document.querySelector("#contactSheetCanvas"),
  downloadContactSheet: document.querySelector("#downloadContactSheet"),
  downloadManifest: document.querySelector("#downloadManifest"),
  downloadTextPack: document.querySelector("#downloadTextPack"),
  clearResults: document.querySelector("#clearResults"),
  manifestImport: document.querySelector("#manifestImport"),
  historyList: document.querySelector("#historyList"),
  assetPackImport: document.querySelector("#assetPackImport"),
  googleConnect: document.querySelector("#googleConnect"),
  driveSyncUpload: document.querySelector("#driveSyncUpload"),
  driveSyncDownload: document.querySelector("#driveSyncDownload"),
  driveStatus: document.querySelector("#driveStatus"),
  downloadAssetPack: document.querySelector("#downloadAssetPack"),
  clearAssetLibrary: document.querySelector("#clearAssetLibrary"),
  assetPackName: document.querySelector("#assetPackName"),
  assetSummary: document.querySelector("#assetSummary"),
  assetLibraryList: document.querySelector("#assetLibraryList"),
  assetCharacterId: document.querySelector("#assetCharacterId"),
  assetCharacterName: document.querySelector("#assetCharacterName"),
  assetCharacterVersion: document.querySelector("#assetCharacterVersion"),
  assetCharacterQuality: document.querySelector("#assetCharacterQuality"),
  assetCharacterStatus: document.querySelector("#assetCharacterStatus"),
  assetCharacterTags: document.querySelector("#assetCharacterTags"),
  assetCharacterDescription: document.querySelector("#assetCharacterDescription"),
  assetCharacterConsistency: document.querySelector("#assetCharacterConsistency"),
  assetCharacterNegative: document.querySelector("#assetCharacterNegative"),
  assetCharacterNotes: document.querySelector("#assetCharacterNotes"),
  assetCharacterAdult: document.querySelector("#assetCharacterAdult"),
  assetCharacterImages: document.querySelector("#assetCharacterImages"),
  assetCharacterPreview: document.querySelector("#assetCharacterPreview"),
  assetSceneId: document.querySelector("#assetSceneId"),
  assetSceneName: document.querySelector("#assetSceneName"),
  assetSceneMood: document.querySelector("#assetSceneMood"),
  assetSceneTags: document.querySelector("#assetSceneTags"),
  assetScenePrompt: document.querySelector("#assetScenePrompt"),
  assetSceneNotes: document.querySelector("#assetSceneNotes"),
  assetSceneImage: document.querySelector("#assetSceneImage"),
  assetScenePreview: document.querySelector("#assetScenePreview"),
  assetOutfitId: document.querySelector("#assetOutfitId"),
  assetOutfitName: document.querySelector("#assetOutfitName"),
  assetOutfitCategory: document.querySelector("#assetOutfitCategory"),
  assetOutfitSafety: document.querySelector("#assetOutfitSafety"),
  assetOutfitTags: document.querySelector("#assetOutfitTags"),
  assetOutfitSceneFit: document.querySelector("#assetOutfitSceneFit"),
  assetOutfitPrompt: document.querySelector("#assetOutfitPrompt"),
  assetOutfitNotes: document.querySelector("#assetOutfitNotes"),
  assetOutfitImage: document.querySelector("#assetOutfitImage"),
  assetOutfitPreview: document.querySelector("#assetOutfitPreview")
};

const defaultState = {
  characterId: "girl-hk-001",
  characterDescription: "香港女生，長髮，五官甜美，身材比例自然，固定面部特徵",
  consistencyNotes: "same face, same identity, consistent body proportion, consistent hairstyle, realistic skin texture",
  scene: "central-pier",
  outfit: "ol",
  sourceMode: "asset",
  characterAssetId: "manual",
  characterImageType: "manual",
  mood: "sweet",
  style: "iphone",
  count: 6,
  poses: ["front-smile", "side-look", "hair-touch", "walking", "seated", "closeup", "mirror", "lean-wall", "looking-down"]
};

const defaultSettings = {
  apiKey: "",
  model: "gpt-image-1.5",
  quality: "medium",
  size: "1024x1024",
  googleClientId: "",
  adultConfirm: false
};

const defaultAssetLibrary = {
  version: 1,
  name: "hair-salon-main-library",
  createdAt: "",
  characters: [],
  scenes: [],
  outfits: []
};

const characterImageTypes = [
  ["front", "正面"],
  ["angle-45", "45 度"],
  ["side", "側面"],
  ["full-body", "全身"],
  ["selfie", "自拍"],
  ["smile", "笑容"],
  ["cool", "冷感"],
  ["natural", "自然表情"]
];

let state = loadObject("factoryState", defaultState);
let settings = loadObject("factorySettings", defaultSettings);
let assetLibrary = normalizeAssetLibrary(loadObject("assetLibrary", defaultAssetLibrary));
let referenceFile = null;
let referenceDataUrl = "";
let assetReferenceDataUrl = "";
let results = [];
let currentManifest = null;
let history = loadArray("factoryHistory");
let isGenerating = false;
let pendingCharacterImages = [];
let pendingSceneImage = "";
let pendingOutfitImage = "";
let googleTokenClient = null;
let googleAccessToken = "";
let driveFolderIds = {
  root: "",
  assetPacks: "",
  main: ""
};

function loadObject(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && !Array.isArray(parsed) ? { ...fallback, ...parsed } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function loadArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveState() {
  localStorage.setItem("factoryState", JSON.stringify(state));
}

function saveSettings() {
  localStorage.setItem("factorySettings", JSON.stringify(settings));
}

function driveReady() {
  return Boolean(googleAccessToken);
}

function setDriveStatus(message, type = "") {
  elements.driveStatus.textContent = message;
  elements.driveStatus.className = `drive-status${type ? ` ${type}` : ""}`;
  elements.driveSyncUpload.disabled = !driveReady();
  elements.driveSyncDownload.disabled = !driveReady();
}

async function connectGoogleDrive() {
  if (!settings.googleClientId.trim()) {
    toast("請先輸入 Google OAuth Client ID。", true);
    setDriveStatus("請先在 OpenAI 設定區輸入 Google OAuth Client ID。", "error");
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    toast("Google Identity Services 未載入，請稍後再試。", true);
    setDriveStatus("Google Identity Services 未載入。請確認網絡可讀 accounts.google.com。", "error");
    return;
  }
  googleTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: settings.googleClientId.trim(),
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: async (response) => {
      if (response.error) {
        setDriveStatus(`Drive 連接失敗：${response.error}`, "error");
        return;
      }
      googleAccessToken = response.access_token;
      setDriveStatus("Drive 已連接，正在準備資產庫資料夾...", "connected");
      try {
        await ensureDriveAssetFolders();
        setDriveStatus("Drive 已連接：My Drive / AI Image Factory / asset-packs / main 已準備好。", "connected");
        toast("Google Drive 已連接");
      } catch (error) {
        setDriveStatus(`Drive 資料夾準備失敗：${normalizeError(error)}`, "error");
      }
    }
  });
  googleTokenClient.requestAccessToken({ prompt: "consent" });
}

async function driveFetch(url, options = {}) {
  if (!googleAccessToken) throw new Error("Google Drive 未連接。");
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google Drive API error ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

function driveQuery(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findDriveChildFolder(parentId, name) {
  const q = encodeURIComponent(`'${parentId}' in parents and name = '${driveQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive&pageSize=1`;
  const result = await driveFetch(url);
  return result.files?.[0] || null;
}

async function createDriveFolder(parentId, name) {
  return driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });
}

async function ensureDriveChildFolder(parentId, name) {
  return (await findDriveChildFolder(parentId, name)) || createDriveFolder(parentId, name);
}

async function ensureDriveAssetFolders() {
  const root = await ensureDriveChildFolder("root", "AI Image Factory");
  const assetPacks = await ensureDriveChildFolder(root.id, "asset-packs");
  const main = await ensureDriveChildFolder(assetPacks.id, "main");
  driveFolderIds = { root: root.id, assetPacks: assetPacks.id, main: main.id };
  return driveFolderIds;
}

async function findAssetPackFile() {
  await ensureDriveAssetFolders();
  const q = encodeURIComponent(`'${driveFolderIds.main}' in parents and name = 'asset-pack.json' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&spaces=drive&pageSize=1`;
  const result = await driveFetch(url);
  return result.files?.[0] || null;
}

async function uploadAssetPackToDrive() {
  setDriveStatus("正在同步 asset-pack 到 Google Drive...", "connected");
  const pack = buildAssetPack();
  const existing = await findAssetPackFile();
  const metadata = {
    name: "asset-pack.json",
    mimeType: "application/json",
    parents: existing ? undefined : [driveFolderIds.main]
  };
  const boundary = `codex_${Date.now()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(pack, null, 2),
    `--${boundary}--`
  ].join("\r\n");
  const method = existing ? "PATCH" : "POST";
  const endpoint = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=id,name,modifiedTime`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime";
  const file = await driveFetch(endpoint, {
    method,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  setDriveStatus(`已同步到 Google Drive：asset-pack.json（${new Date(file.modifiedTime).toLocaleString("zh-HK")}）`, "connected");
  toast("asset-pack 已同步到 Drive");
}

async function downloadAssetPackFromDrive() {
  setDriveStatus("正在從 Google Drive 載入 asset-pack...", "connected");
  const file = await findAssetPackFile();
  if (!file) {
    setDriveStatus("Drive 未找到 asset-pack.json，請先同步上 Drive。", "error");
    return;
  }
  const text = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  importAssetPack(JSON.parse(text));
  setDriveStatus(`已從 Google Drive 載入 asset-pack.json（${new Date(file.modifiedTime).toLocaleString("zh-HK")}）`, "connected");
}

function saveAssetLibrary() {
  assetLibrary = normalizeAssetLibrary(assetLibrary);
  localStorage.setItem("assetLibrary", JSON.stringify(assetLibrary));
}

function normalizeAssetLibrary(library) {
  return {
    version: Number(library?.version || 1),
    name: library?.name || defaultAssetLibrary.name,
    createdAt: library?.createdAt || new Date().toISOString(),
    characters: Array.isArray(library?.characters) ? library.characters : [],
    scenes: Array.isArray(library?.scenes) ? library.scenes : [],
    outfits: Array.isArray(library?.outfits) ? library.outfits : []
  };
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value, fallback = "asset") {
  return safeFilename(value || fallback) || fallback;
}

function optionById(group, id) {
  if (group === "scenes") return sceneOptionById(id);
  if (group === "outfits") return outfitOptionById(id);
  return libraries[group].find((item) => item[0] === id) || libraries[group][0];
}

function sceneOptions() {
  return [
    ...libraries.scenes.map((item) => [...item, "builtin"]),
    ...assetLibrary.scenes.map((item) => [`asset-scene:${item.id}`, item.name, item.prompt, "asset", item])
  ];
}

function outfitOptions() {
  return [
    ...libraries.outfits.map((item) => [...item, "builtin"]),
    ...assetLibrary.outfits.map((item) => [`asset-outfit:${item.id}`, item.name, item.prompt, "asset", item])
  ];
}

function sceneOptionById(id) {
  return sceneOptions().find((item) => item[0] === id) || sceneOptions()[0];
}

function outfitOptionById(id) {
  return outfitOptions().find((item) => item[0] === id) || outfitOptions()[0];
}

function selectedCharacter() {
  if (!state.characterAssetId || state.characterAssetId === "manual") return null;
  return assetLibrary.characters.find((item) => item.id === state.characterAssetId) || null;
}

function selectedCharacterImage() {
  const character = selectedCharacter();
  if (!character) return null;
  return character.images.find((item) => item.type === state.characterImageType) || character.images[0] || null;
}

function activePoseIds() {
  return state.poses.slice(0, Number(state.count));
}

function populateSelect(select, group, selectedId) {
  select.innerHTML = "";
  libraries[group].forEach(([id, label]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    option.selected = id === selectedId;
    select.appendChild(option);
  });
}

function populateSceneSelect() {
  populateOptionList(elements.sceneSelect, sceneOptions(), state.scene);
}

function populateOutfitSelect() {
  populateOptionList(elements.outfitSelect, outfitOptions(), state.outfit);
}

function populateOptionList(select, options, selectedId) {
  select.innerHTML = "";
  options.forEach(([id, label, prompt, source]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = source === "asset" ? `庫存 · ${label}` : label;
    option.selected = id === selectedId;
    select.appendChild(option);
  });
}

function renderCharacterSelectors() {
  elements.characterSelect.innerHTML = "";
  const manual = document.createElement("option");
  manual.value = "manual";
  manual.textContent = "手動參考圖";
  manual.selected = !state.characterAssetId || state.characterAssetId === "manual";
  elements.characterSelect.appendChild(manual);
  assetLibrary.characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `庫存 · ${character.name || character.id}`;
    option.selected = character.id === state.characterAssetId;
    elements.characterSelect.appendChild(option);
  });
  renderCharacterImageSelect();
}

function renderCharacterImageSelect() {
  elements.characterImageSelect.innerHTML = "";
  const character = selectedCharacter();
  if (!character?.images?.length) {
    const option = document.createElement("option");
    option.value = "manual";
    option.textContent = "使用手動上傳";
    option.selected = true;
    elements.characterImageSelect.appendChild(option);
    elements.characterImageSelect.disabled = true;
    return;
  }
  elements.characterImageSelect.disabled = false;
  character.images.forEach((image) => {
    const option = document.createElement("option");
    option.value = image.type;
    option.textContent = image.label || image.type;
    option.selected = image.type === state.characterImageType;
    elements.characterImageSelect.appendChild(option);
  });
  if (!character.images.some((image) => image.type === state.characterImageType)) {
    state.characterImageType = character.images[0].type;
  }
}

function renderPoseGrid() {
  elements.poseGrid.innerHTML = "";
  elements.poseCountLabel.textContent = `${state.count} 格`;
  activePoseIds().forEach((poseId, index) => {
    const pose = optionById("poses", poseId);
    const card = document.createElement("div");
    card.className = "pose-card";
    card.innerHTML = `
      <div>
        <div class="pose-number">${index + 1}</div>
        <p class="pose-preview">${pose[1]}<br>${pose[2]}</p>
      </div>
    `;

    const select = document.createElement("select");
    libraries.poses.forEach(([id, label]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = label;
      option.selected = id === poseId;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      state.poses[index] = select.value;
      saveState();
      renderPoseGrid();
      renderOutputs();
      resetResults();
    });
    card.appendChild(select);
    elements.poseGrid.appendChild(card);
  });
}

function buildBasePrompt() {
  const scene = optionById("scenes", state.scene);
  const outfit = optionById("outfits", state.outfit);
  const mood = optionById("moods", state.mood);
  const style = optionById("styles", state.style);
  const character = selectedCharacter();
  const characterImage = selectedCharacterImage();
  const characterDescription = character?.description || state.characterDescription;
  const consistencyNotes = character?.consistencyNotes || state.consistencyNotes;
  const negativePrompt = character?.negativePrompt ? `Character forbidden details: ${character.negativePrompt}` : "";
  const sceneAsset = scene[4];
  const outfitAsset = outfit[4];
  return [
    `Character ID: ${character?.id || state.characterId}`,
    `Character: ${characterDescription}`,
    characterImage ? `Reference angle/expression: ${characterImage.label || characterImage.type}` : "",
    character?.tags?.length ? `Character tags: ${character.tags.join(", ")}` : "",
    character?.qualityRating ? `Character consistency grade: ${character.qualityRating}` : "",
    `Face and identity consistency: ${consistencyNotes}`,
    negativePrompt,
    `Scene: ${scene[2]}`,
    sceneAsset?.mood ? `Scene mood: ${sceneAsset.mood}` : "",
    sceneAsset?.notes ? `Scene restrictions: ${sceneAsset.notes}` : "",
    `Outfit: ${outfit[2]}`,
    outfitAsset?.category ? `Outfit category: ${outfitAsset.category}` : "",
    outfitAsset?.safety ? `Outfit safety: ${outfitAsset.safety}` : "",
    outfitAsset?.sceneFit?.length ? `Outfit best-fit scenes: ${outfitAsset.sceneFit.join(", ")}` : "",
    `Emotion: ${mood[2]}`,
    `Photography style: ${style[2]}`,
    "Audience: adult fashion, beauty, hair salon and social media content.",
    "Safety: adult 18+ subject only, tasteful fashion styling, non-explicit, no nudity, no sexual act, no minor-coded appearance.",
    "Quality rules: preserve the same face, age, hairstyle, body proportion, and identity from the reference image. Use realistic anatomy, natural hands, natural skin texture, coherent lighting, and social-media-ready composition. No text, watermark, logo, extra fingers, distorted face, duplicate limbs, or uncanny anatomy."
  ].filter(Boolean).join("\n");
}

function buildPromptForPose(poseId, index) {
  const pose = optionById("poses", poseId);
  return [
    buildBasePrompt(),
    "",
    `Panel ${index + 1} pose: ${pose[2]}`,
    "Generate one finished image for this single pose. Keep the same character identity as the reference image."
  ].join("\n");
}

function buildPrompt() {
  const poseLines = activePoseIds().map((poseId, index) => {
    const pose = optionById("poses", poseId);
    return `${index + 1}. ${pose[1]} — ${pose[2]}`;
  });
  return [
    `Create a ${state.count}-image character-consistent set using the uploaded reference image.`,
    "",
    buildBasePrompt(),
    "",
    "Pose queue:",
    ...poseLines,
    "",
    "Generation mode: create one independent image per pose, then assemble a contact sheet in the browser."
  ].join("\n");
}

function buildCaption() {
  const scene = optionById("scenes", state.scene)[1];
  const outfit = optionById("outfits", state.outfit)[1];
  const mood = optionById("moods", state.mood)[1];
  const character = selectedCharacter();
  const name = character?.name || state.characterId;
  return `今日造型：${name} / ${outfit} x ${scene}\n狀態：${mood}\n\n#香港女生 #髮型靈感 #AI寫真 #ootd #hkcontent`;
}

function renderOutputs() {
  elements.promptOutput.value = buildPrompt();
  elements.captionOutput.value = buildCaption();
  renderPreflight();
}

function renderResults() {
  elements.resultGrid.innerHTML = "";
  activePoseIds().forEach((poseId, index) => {
    const result = results[index] || {
      status: "ready",
      dataUrl: "",
      error: "",
      prompt: buildPromptForPose(poseId, index)
    };
    const pose = optionById("poses", poseId);
    const card = document.createElement("article");
    card.className = "result-card";
    const imageHtml = result.dataUrl
      ? `<img src="${result.dataUrl}" alt="${pose[1]} 生成結果">`
      : `<span>${result.status === "running" ? "生成中..." : "等待生成"}</span>`;
    card.innerHTML = `
      <div class="result-preview">${imageHtml}</div>
      <div class="result-body">
        <strong>${index + 1}. ${pose[1]}</strong>
        <span class="result-status status-${result.status}">${statusLabel(result)}</span>
        <div class="result-actions">
          <button type="button" data-action="download" data-index="${index}" ${result.dataUrl ? "" : "disabled"}>下載</button>
          <button type="button" data-action="copy-prompt" data-index="${index}">Prompt</button>
          <button type="button" data-action="retry" data-index="${index}" ${result.status === "error" && !isGenerating ? "" : "disabled"}>重試</button>
        </div>
      </div>
    `;
    elements.resultGrid.appendChild(card);
  });

  elements.downloadContactSheet.disabled = !currentManifest?.contactSheet;
  elements.downloadManifest.disabled = !currentManifest;
  elements.clearResults.disabled = !results.length && !currentManifest;
}

function statusLabel(result) {
  if (result.status === "success") return "成功";
  if (result.status === "running") return "生成中";
  if (result.status === "error") return result.error || "失敗";
  return "待生成";
}

function resetResults() {
  results = [];
  currentManifest = null;
  elements.contactSheetWrap.classList.remove("active");
  setProgress(0);
  renderResults();
  renderPreflight();
}

function validateBeforeGenerate() {
  if (!settings.apiKey.trim()) return "請先輸入 OpenAI API key。";
  if (!getActiveReferenceSource()) return "請先選人物庫圖片或上傳人物參考圖。";
  if (!settings.adultConfirm) return "請先確認成人時尚安全線。";
  if (isGenerating) return "正在生成，請稍候。";
  return "";
}

async function generateAll() {
  const validation = validateBeforeGenerate();
  if (validation) {
    toast(validation, true);
    setStatus("未能開始", validation);
    return;
  }

  isGenerating = true;
  currentManifest = null;
  results = activePoseIds().map((poseId, index) => ({
    status: "ready",
    dataUrl: "",
    error: "",
    prompt: buildPromptForPose(poseId, index)
  }));
  renderResults();
  setProgress(0);
  setControlsDisabled(true);

  let successCount = 0;
  for (let index = 0; index < activePoseIds().length; index += 1) {
    setStatus("生成中", `第 ${index + 1}/${state.count} 張`);
    results[index].status = "running";
    renderResults();
    try {
      results[index].dataUrl = await openAiImageEdit(results[index].prompt);
      results[index].status = "success";
      successCount += 1;
    } catch (error) {
      results[index].status = "error";
      results[index].error = normalizeError(error);
    }
    setProgress(((index + 1) / activePoseIds().length) * 100);
    renderResults();
  }

  isGenerating = false;
  setControlsDisabled(false);
  await finalizeRun();
  const failedCount = results.filter((item) => item.status === "error").length;
  if (failedCount) {
    setStatus("部分失敗", `成功 ${successCount} 張，失敗 ${failedCount} 張，可逐張重試。`);
  } else {
    setStatus("完成", `成功生成 ${successCount} 張圖片。`);
  }
}

async function demoGenerateAll() {
  if (!settings.adultConfirm) {
    toast("請先確認成人時尚安全線，Demo 都會跟同一條內容邊界。", true);
    setStatus("未能開始", "請先確認成人時尚安全線。");
    return;
  }
  if (isGenerating) return;

  isGenerating = true;
  currentManifest = null;
  results = activePoseIds().map((poseId, index) => ({
    status: "ready",
    dataUrl: "",
    error: "",
    prompt: buildPromptForPose(poseId, index)
  }));
  setControlsDisabled(true);
  setProgress(0);
  renderResults();

  for (let index = 0; index < results.length; index += 1) {
    setStatus("Demo 生成中", `第 ${index + 1}/${state.count} 張`);
    results[index].status = "running";
    renderResults();
    await sleep(180);
    results[index].dataUrl = makeDemoImage(index);
    results[index].status = "success";
    setProgress(((index + 1) / results.length) * 100);
    renderResults();
  }

  isGenerating = false;
  setControlsDisabled(false);
  await finalizeRun();
  setStatus("Demo 完成", `已生成 ${results.length} 張示範圖片，可下載拼圖同素材包。`);
  toast("Demo 素材已生成");
}

async function retryOne(index) {
  const validation = validateBeforeGenerate();
  if (validation) {
    toast(validation, true);
    return;
  }

  isGenerating = true;
  setControlsDisabled(true);
  results[index].status = "running";
  results[index].error = "";
  renderResults();
  setStatus("重試中", `第 ${index + 1} 張`);
  try {
    results[index].dataUrl = await openAiImageEdit(results[index].prompt);
    results[index].status = "success";
  } catch (error) {
    results[index].status = "error";
    results[index].error = normalizeError(error);
  }
  isGenerating = false;
  setControlsDisabled(false);
  await finalizeRun();
  renderResults();
}

async function openAiImageEdit(prompt) {
  const referenceSource = getActiveReferenceSource();
  if (!referenceSource) throw new Error("未有可用人物參考圖。");
  const formData = new FormData();
  formData.append("model", settings.model);
  formData.append("image", referenceSource.file, referenceSource.name);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", settings.size);
  formData.append("quality", settings.quality);
  formData.append("output_format", "png");
  formData.append("input_fidelity", "high");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey.trim()}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI API error ${response.status}`);
  }

  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error("API 回應未包含 b64_json 圖片。");
  return `data:image/png;base64,${b64}`;
}

function getActiveReferenceSource() {
  const characterImage = state.sourceMode !== "manual" ? selectedCharacterImage() : null;
  if (characterImage?.dataUrl) {
    try {
      return {
        file: dataUrlToFile(characterImage.dataUrl, `${state.characterAssetId}-${characterImage.type}.png`),
        name: `${state.characterAssetId}-${characterImage.type}.png`
      };
    } catch {
      return null;
    }
  }
  if (referenceFile) {
    return { file: referenceFile, name: referenceFile.name || "reference.png" };
  }
  return null;
}

function dataUrlToFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/png";
  const isBase64 = header.includes(";base64");
  const binary = isBase64 ? atob(data) : decodeURIComponent(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (message.toLowerCase().includes("failed to fetch")) {
    return "網絡或 CORS 阻擋，請用本機 HTTP server 開啟或改用後端 proxy。";
  }
  return message;
}

async function finalizeRun() {
  const successful = results.filter((item) => item.status === "success" && item.dataUrl);
  let contactSheet = "";
  if (successful.length > 1) {
    contactSheet = await drawContactSheet(results);
    elements.contactSheetWrap.classList.add("active");
  } else {
    elements.contactSheetWrap.classList.remove("active");
  }

  if (successful.length) {
    currentManifest = buildManifest(contactSheet);
    addHistory(currentManifest);
  } else {
    currentManifest = null;
  }
  renderResults();
}

function buildManifest(contactSheet) {
  const now = new Date();
  const successful = results.filter((item) => item.status === "success").length;
  const failed = results.filter((item) => item.status === "error").length;
  return {
    version: 1,
    createdAt: now.toISOString(),
    character: {
      id: selectedCharacter()?.id || state.characterId,
      name: selectedCharacter()?.name || "",
      description: selectedCharacter()?.description || state.characterDescription,
      consistencyNotes: selectedCharacter()?.consistencyNotes || state.consistencyNotes,
      selectedImageType: selectedCharacterImage()?.type || "manual",
      sourceMode: state.sourceMode,
      referenceImage: selectedCharacterImage()?.dataUrl || referenceDataUrl
    },
    settings: {
      model: settings.model,
      quality: settings.quality,
      size: settings.size,
      outputFormat: "png",
      count: Number(state.count),
      mode: results.some((item) => item.dataUrl?.startsWith("data:image/svg+xml")) ? "demo" : "openai"
    },
    selection: {
      scene: optionById("scenes", state.scene),
      outfit: optionById("outfits", state.outfit),
      mood: optionById("moods", state.mood),
      style: optionById("styles", state.style)
    },
    prompt: elements.promptOutput.value,
    caption: elements.captionOutput.value,
    reviewChecklist: buildReviewChecklist(successful, failed),
    images: results.map((item, index) => ({
      index: index + 1,
      pose: optionById("poses", activePoseIds()[index]),
      status: item.status,
      error: item.error,
      prompt: item.prompt,
      dataUrl: item.dataUrl
    })),
    contactSheet
  };
}

function buildReviewChecklist(successful, failed) {
  return [
    "確認角色臉部、髮型、身材比例在所有圖內一致。",
    "檢查手指、四肢、五官、鏡像反射、文字水印是否異常。",
    "確認衣服、場景、情緒、拍攝風格符合今次 campaign。",
    "確認內容符合成人時尚安全線：18+、非露骨、非冒充真人。",
    `生成摘要：成功 ${successful} 張，失敗 ${failed} 張，總數 ${state.count} 張。`
  ];
}

function buildTextPack() {
  const posePrompts = activePoseIds()
    .map((poseId, index) => {
      const pose = optionById("poses", poseId);
      const resultPrompt = results[index]?.prompt || buildPromptForPose(poseId, index);
      return [`## ${index + 1}. ${pose[1]}`, resultPrompt].join("\n");
    })
    .join("\n\n---\n\n");

  return [
    `# ${state.characterId} 文字包`,
    "",
    "## Caption",
    elements.captionOutput.value,
    "",
    "## Set Prompt",
    elements.promptOutput.value,
    "",
    "## Pose Prompts",
    posePrompts,
    "",
    "## 審稿 Checklist",
    ...buildReviewChecklist(
      results.filter((item) => item.status === "success").length,
      results.filter((item) => item.status === "error").length
    ).map((item) => `- ${item}`)
  ].join("\n");
}

function loadManifest(manifest) {
  if (!manifest?.images?.length || !manifest?.character) {
    toast("素材包格式不正確。", true);
    return;
  }

  state.characterId = manifest.character.id || state.characterId;
  state.characterDescription = manifest.character.description || state.characterDescription;
  state.consistencyNotes = manifest.character.consistencyNotes || state.consistencyNotes;
  state.count = Math.min(Math.max(Number(manifest.settings?.count || manifest.images.length), 1), 9);
  state.poses = manifest.images.map((item) => item.pose?.[0]).filter(Boolean);
  while (state.poses.length < 9) state.poses.push(defaultState.poses[state.poses.length] || defaultState.poses[0]);

  const [sceneId] = manifest.selection?.scene || [];
  const [outfitId] = manifest.selection?.outfit || [];
  const [moodId] = manifest.selection?.mood || [];
  const [styleId] = manifest.selection?.style || [];
  if (sceneId) state.scene = sceneId;
  if (outfitId) state.outfit = outfitId;
  if (moodId) state.mood = moodId;
  if (styleId) state.style = styleId;

  referenceDataUrl = manifest.character.referenceImage || "";
  referenceFile = null;
  if (referenceDataUrl) {
    elements.referencePreview.src = referenceDataUrl;
    elements.uploadBox.classList.add("has-image");
  }

  results = manifest.images.map((item) => ({
    status: item.status || (item.dataUrl ? "success" : "ready"),
    dataUrl: item.dataUrl || "",
    error: item.error || "",
    prompt: item.prompt || ""
  }));
  currentManifest = manifest;
  if (manifest.contactSheet) {
    loadImage(manifest.contactSheet).then((image) => {
      const canvas = elements.contactSheetCanvas;
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      elements.contactSheetWrap.classList.add("active");
    });
  } else {
    elements.contactSheetWrap.classList.remove("active");
  }
  saveState();
  hydrate();
  renderResults();
  setProgress(100);
  setStatus("已匯入", "素材包已回載到工作台。");
  toast("素材包已匯入");
}

async function drawContactSheet(items) {
  const images = [];
  for (const item of items) {
    if (item.dataUrl) images.push(await loadImage(item.dataUrl));
  }
  if (!images.length) return "";

  const count = Number(state.count);
  const columns = count === 1 ? 1 : 3;
  const rows = Math.ceil(images.length / columns);
  const cell = 1024;
  const canvas = elements.contactSheetCanvas;
  canvas.width = columns * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((image, index) => {
    const x = (index % columns) * cell;
    const y = Math.floor(index / columns) * cell;
    const scale = Math.max(cell / image.width, cell / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, x + (cell - width) / 2, y + (cell - height) / 2, width, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x + 18, y + 18, 62, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.fillText(String(index + 1), x + 40, y + 53);
  });

  return canvas.toDataURL("image/png");
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function addHistory(manifest) {
  const successful = manifest.images.filter((item) => item.status === "success").length;
  history.unshift({
    id: `${manifest.character.id}-${Date.now()}`,
    title: `${manifest.character.id} / ${manifest.selection.outfit[1]} / ${manifest.selection.scene[1]}`,
    meta: `${successful}/${manifest.settings.count} 張 · ${manifest.settings.model} · ${new Date(manifest.createdAt).toLocaleString("zh-HK")}`,
    manifest
  });
  history = history.slice(0, 8);
  localStorage.setItem("factoryHistory", JSON.stringify(history.map(({ manifest, ...item }) => item)));
  renderHistory();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.innerHTML = "<p>未有生成紀錄。</p>";
    elements.historyList.appendChild(empty);
    return;
  }
  history.forEach((item) => {
    const node = document.createElement("div");
    node.className = "history-item";
    node.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <p>${item.meta}</p>
      </div>
    `;
    elements.historyList.appendChild(node);
  });
}

function renderAssetLibrary() {
  elements.assetPackName.value = assetLibrary.name;
  elements.assetSummary.innerHTML = [
    ["人物", assetLibrary.characters.length],
    ["場景", assetLibrary.scenes.length],
    ["衣服", assetLibrary.outfits.length]
  ].map(([label, count]) => `
    <div class="asset-summary-item">
      <strong>${count}</strong>
      <span>${label}庫存</span>
    </div>
  `).join("");

  const cards = [
    ...assetLibrary.characters.map((item) => ({
      type: "character",
      id: item.id,
      name: item.name || item.id,
      meta: `${item.images?.length || 0} 張 · ${item.qualityRating || "未評級"} · ${item.reviewStatus || "draft"}`,
      image: item.images?.[0]?.dataUrl || ""
    })),
    ...assetLibrary.scenes.map((item) => ({
      type: "scene",
      id: item.id,
      name: item.name || item.id,
      meta: item.mood || "場景",
      image: item.dataUrl || ""
    })),
    ...assetLibrary.outfits.map((item) => ({
      type: "outfit",
      id: item.id,
      name: item.name || item.id,
      meta: `${item.category || "服裝"} · ${item.safety || "non-explicit"}`,
      image: item.dataUrl || ""
    }))
  ];

  elements.assetLibraryList.innerHTML = cards.length ? cards.map((item) => `
    <article class="asset-library-card">
      ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<img alt="${item.name}">`}
      <div>
        <strong>${item.name}</strong>
        <span>${item.type} / ${item.id}<br>${item.meta}</span>
      </div>
      <button type="button" data-asset-type="${item.type}" data-asset-id="${item.id}">刪除</button>
    </article>
  `).join("") : "<p class=\"note\">未有資產。先加入人物、場景或衣服，再下載 asset-pack 放入 Google Drive。</p>";

  renderCharacterSelectors();
  populateSceneSelect();
  populateOutfitSelect();
}

function buildAssetPack() {
  return {
    version: 1,
    name: assetLibrary.name || defaultAssetLibrary.name,
    createdAt: assetLibrary.createdAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    characters: assetLibrary.characters,
    scenes: assetLibrary.scenes,
    outfits: assetLibrary.outfits
  };
}

function importAssetPack(pack) {
  if (!pack || (!Array.isArray(pack.characters) && !Array.isArray(pack.scenes) && !Array.isArray(pack.outfits))) {
    toast("asset-pack 格式不正確。", true);
    return;
  }
  assetLibrary = normalizeAssetLibrary(pack);
  saveAssetLibrary();
  hydrate();
  setStatus("已匯入資產庫", `${assetLibrary.characters.length} 人物、${assetLibrary.scenes.length} 場景、${assetLibrary.outfits.length} 衣服。`);
  toast("asset-pack 已匯入");
}

function upsertById(items, item) {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) items[index] = item;
  else items.push(item);
}

function renderPendingImages(container, images) {
  container.innerHTML = images.map((image) => `
    <div class="asset-thumb">
      <img src="${image.dataUrl}" alt="${image.label}">
      <span>${image.label}</span>
    </div>
  `).join("");
}

function clearAssetInputs(kind) {
  if (kind === "character") {
    [
      elements.assetCharacterId,
      elements.assetCharacterName,
      elements.assetCharacterVersion,
      elements.assetCharacterTags,
      elements.assetCharacterDescription,
      elements.assetCharacterConsistency,
      elements.assetCharacterNegative,
      elements.assetCharacterNotes
    ].forEach((input) => { input.value = ""; });
    elements.assetCharacterQuality.value = "A";
    elements.assetCharacterStatus.value = "approved";
    elements.assetCharacterAdult.checked = true;
    elements.assetCharacterImages.value = "";
    pendingCharacterImages = [];
    renderPendingImages(elements.assetCharacterPreview, pendingCharacterImages);
  }
  if (kind === "scene") {
    [
      elements.assetSceneId,
      elements.assetSceneName,
      elements.assetSceneMood,
      elements.assetSceneTags,
      elements.assetScenePrompt,
      elements.assetSceneNotes
    ].forEach((input) => { input.value = ""; });
    elements.assetSceneImage.value = "";
    pendingSceneImage = "";
    renderPendingImages(elements.assetScenePreview, []);
  }
  if (kind === "outfit") {
    [
      elements.assetOutfitId,
      elements.assetOutfitName,
      elements.assetOutfitCategory,
      elements.assetOutfitTags,
      elements.assetOutfitSceneFit,
      elements.assetOutfitPrompt,
      elements.assetOutfitNotes
    ].forEach((input) => { input.value = ""; });
    elements.assetOutfitSafety.value = "non-explicit";
    elements.assetOutfitImage.value = "";
    pendingOutfitImage = "";
    renderPendingImages(elements.assetOutfitPreview, []);
  }
}

function renderPreflight() {
  const items = [
    ["參考圖", Boolean(getActiveReferenceSource() || referenceDataUrl)],
    ["API key", Boolean(settings.apiKey.trim())],
    ["安全線", Boolean(settings.adultConfirm)],
    [`${state.count} 張`, activePoseIds().length === Number(state.count)],
    ["文字包", Boolean(elements.promptOutput.value && elements.captionOutput.value)]
  ];
  elements.preflightList.innerHTML = items
    .map(([label, ready]) => `
      <div class="preflight-item ${ready ? "ready" : ""}">
        <span class="preflight-dot"></span>
        <span>${ready ? "已備妥" : "待處理"} · ${label}</span>
      </div>
    `)
    .join("");
}

function updateReferenceFromCharacter() {
  const character = selectedCharacter();
  const image = selectedCharacterImage();
  assetReferenceDataUrl = image?.dataUrl || "";
  if (character && image?.dataUrl && state.sourceMode !== "manual") {
    referenceDataUrl = image.dataUrl;
    elements.referencePreview.src = image.dataUrl;
    elements.uploadBox.classList.add("has-image");
  } else if (!referenceFile && !referenceDataUrl) {
    referenceDataUrl = "";
    elements.referencePreview.removeAttribute("src");
    elements.uploadBox.classList.remove("has-image");
  } else if (referenceDataUrl) {
    elements.referencePreview.src = referenceDataUrl;
    elements.uploadBox.classList.add("has-image");
  }
  renderPreflight();
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function downloadText(text, filename, type = "application/json") {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function safeFilename(value) {
  return String(value || "image-set")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function setStatus(status, meta) {
  elements.runStatus.textContent = status;
  elements.runMeta.textContent = meta;
}

function setProgress(value) {
  elements.progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function setControlsDisabled(disabled) {
  document.querySelector("#generateImages").disabled = disabled;
  document.querySelector("#demoGenerate").disabled = disabled;
  document.querySelector("#randomizePose").disabled = disabled;
  elements.countSelect.disabled = disabled;
}

function toast(message, isError = false) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = document.createElement("div");
  node.className = `toast${isError ? " error" : ""}`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

function hydrate() {
  elements.characterId.value = state.characterId;
  elements.characterDescription.value = state.characterDescription;
  elements.consistencyNotes.value = state.consistencyNotes;
  elements.apiKey.value = settings.apiKey;
  elements.googleClientId.value = settings.googleClientId;
  elements.modelSelect.value = settings.model;
  elements.qualitySelect.value = settings.quality;
  elements.sizeSelect.value = settings.size;
  elements.countSelect.value = String(state.count);
  elements.sourceModeSelect.value = state.sourceMode || "asset";
  elements.adultConfirm.checked = Boolean(settings.adultConfirm);
  renderAssetLibrary();
  populateSelect(elements.moodSelect, "moods", state.mood);
  populateSelect(elements.styleSelect, "styles", state.style);
  renderPoseGrid();
  renderOutputs();
  renderResults();
  renderHistory();
  renderPreflight();
  updateReferenceFromCharacter();
  setDriveStatus(googleAccessToken ? "Drive 已連接。" : "Drive 未連接。第一版會同步到 My Drive / AI Image Factory / asset-packs / main / asset-pack.json。", googleAccessToken ? "connected" : "");
}

function bindControls() {
  elements.referenceUpload.addEventListener("change", async () => {
    const file = elements.referenceUpload.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast("參考圖必須小於 50MB。", true);
      return;
    }
    referenceFile = file;
    referenceDataUrl = await fileToDataUrl(file);
    elements.referencePreview.src = referenceDataUrl;
    elements.uploadBox.classList.add("has-image");
    state.sourceMode = "manual";
    state.characterAssetId = "manual";
    saveState();
    renderCharacterSelectors();
    resetResults();
    renderPreflight();
  });

  elements.sourceModeSelect.addEventListener("change", () => {
    state.sourceMode = elements.sourceModeSelect.value;
    saveState();
    updateReferenceFromCharacter();
    renderOutputs();
    resetResults();
  });

  elements.characterSelect.addEventListener("change", () => {
    state.characterAssetId = elements.characterSelect.value;
    state.sourceMode = state.characterAssetId === "manual" ? "manual" : "asset";
    const character = selectedCharacter();
    state.characterImageType = character?.images?.[0]?.type || "manual";
    if (character) {
      state.characterId = character.id;
      state.characterDescription = character.description || state.characterDescription;
      state.consistencyNotes = character.consistencyNotes || state.consistencyNotes;
    }
    saveState();
    hydrate();
    updateReferenceFromCharacter();
    resetResults();
  });

  elements.characterImageSelect.addEventListener("change", () => {
    state.characterImageType = elements.characterImageSelect.value;
    state.sourceMode = state.characterAssetId === "manual" ? "manual" : "asset";
    saveState();
    updateReferenceFromCharacter();
    renderOutputs();
    resetResults();
  });

  [
    ["characterId", "characterId"],
    ["characterDescription", "characterDescription"],
    ["consistencyNotes", "consistencyNotes"]
  ].forEach(([elementKey, stateKey]) => {
    elements[elementKey].addEventListener("input", () => {
      state[stateKey] = elements[elementKey].value;
      saveState();
      renderOutputs();
      resetResults();
    });
  });

  [
    ["sceneSelect", "scene"],
    ["outfitSelect", "outfit"],
    ["moodSelect", "mood"],
    ["styleSelect", "style"]
  ].forEach(([elementKey, stateKey]) => {
    elements[elementKey].addEventListener("change", () => {
      state[stateKey] = elements[elementKey].value;
      saveState();
      renderOutputs();
      resetResults();
    });
  });

  elements.assetPackName.addEventListener("input", () => {
    assetLibrary.name = elements.assetPackName.value;
    saveAssetLibrary();
  });

  elements.assetCharacterImages.addEventListener("change", async () => {
    const files = Array.from(elements.assetCharacterImages.files || []);
    pendingCharacterImages = await Promise.all(files.map(async (file, index) => {
      const [type, fallbackLabel] = characterImageTypes[index] || [`custom-${index + 1}`, `自訂 ${index + 1}`];
      return {
        type,
        label: fallbackLabel,
        dataUrl: await fileToDataUrl(file)
      };
    }));
    renderPendingImages(elements.assetCharacterPreview, pendingCharacterImages);
  });

  elements.assetSceneImage.addEventListener("change", async () => {
    const file = elements.assetSceneImage.files[0];
    pendingSceneImage = file ? await fileToDataUrl(file) : "";
    renderPendingImages(elements.assetScenePreview, pendingSceneImage ? [{ label: "場景圖", dataUrl: pendingSceneImage }] : []);
  });

  elements.assetOutfitImage.addEventListener("change", async () => {
    const file = elements.assetOutfitImage.files[0];
    pendingOutfitImage = file ? await fileToDataUrl(file) : "";
    renderPendingImages(elements.assetOutfitPreview, pendingOutfitImage ? [{ label: "服裝圖", dataUrl: pendingOutfitImage }] : []);
  });

  document.querySelector("#addCharacterAsset").addEventListener("click", () => {
    const id = slugify(elements.assetCharacterId.value || elements.assetCharacterName.value, "character");
    if (!id || !pendingCharacterImages.length) {
      toast("人物需要 ID/名稱同最少一張圖片。", true);
      return;
    }
    upsertById(assetLibrary.characters, {
      id,
      name: elements.assetCharacterName.value || id,
      version: elements.assetCharacterVersion.value || "v1",
      description: elements.assetCharacterDescription.value,
      consistencyNotes: elements.assetCharacterConsistency.value,
      negativePrompt: elements.assetCharacterNegative.value,
      tags: parseTags(elements.assetCharacterTags.value),
      qualityRating: elements.assetCharacterQuality.value,
      reviewStatus: elements.assetCharacterStatus.value,
      ageConfirmed18Plus: elements.assetCharacterAdult.checked,
      notes: elements.assetCharacterNotes.value,
      source: "local-builder",
      lastUpdated: new Date().toISOString(),
      images: pendingCharacterImages
    });
    saveAssetLibrary();
    clearAssetInputs("character");
    renderAssetLibrary();
    toast("人物已加入資產庫");
  });

  document.querySelector("#addSceneAsset").addEventListener("click", () => {
    const id = slugify(elements.assetSceneId.value || elements.assetSceneName.value, "scene");
    if (!id || !elements.assetScenePrompt.value) {
      toast("場景需要 ID/名稱同 prompt 描述。", true);
      return;
    }
    upsertById(assetLibrary.scenes, {
      id,
      name: elements.assetSceneName.value || id,
      prompt: elements.assetScenePrompt.value,
      mood: elements.assetSceneMood.value,
      tags: parseTags(elements.assetSceneTags.value),
      notes: elements.assetSceneNotes.value,
      source: "local-builder",
      lastUpdated: new Date().toISOString(),
      dataUrl: pendingSceneImage
    });
    saveAssetLibrary();
    clearAssetInputs("scene");
    renderAssetLibrary();
    toast("場景已加入資產庫");
  });

  document.querySelector("#addOutfitAsset").addEventListener("click", () => {
    const id = slugify(elements.assetOutfitId.value || elements.assetOutfitName.value, "outfit");
    if (!id || !elements.assetOutfitPrompt.value) {
      toast("衣服需要 ID/名稱同 prompt 描述。", true);
      return;
    }
    upsertById(assetLibrary.outfits, {
      id,
      name: elements.assetOutfitName.value || id,
      category: elements.assetOutfitCategory.value,
      prompt: elements.assetOutfitPrompt.value,
      safety: elements.assetOutfitSafety.value,
      tags: parseTags(elements.assetOutfitTags.value),
      sceneFit: parseTags(elements.assetOutfitSceneFit.value),
      notes: elements.assetOutfitNotes.value,
      source: "local-builder",
      lastUpdated: new Date().toISOString(),
      dataUrl: pendingOutfitImage
    });
    saveAssetLibrary();
    clearAssetInputs("outfit");
    renderAssetLibrary();
    toast("衣服已加入資產庫");
  });

  [
    ["apiKey", "apiKey"],
    ["googleClientId", "googleClientId"],
    ["modelSelect", "model"],
    ["qualitySelect", "quality"],
    ["sizeSelect", "size"]
  ].forEach(([elementKey, settingKey]) => {
    elements[elementKey].addEventListener("input", () => {
      settings[settingKey] = elements[elementKey].value;
      saveSettings();
    });
    elements[elementKey].addEventListener("change", () => {
      settings[settingKey] = elements[elementKey].value;
      saveSettings();
    });
  });

  elements.adultConfirm.addEventListener("change", () => {
    settings.adultConfirm = elements.adultConfirm.checked;
    saveSettings();
    renderPreflight();
  });

  elements.countSelect.addEventListener("change", () => {
    state.count = Number(elements.countSelect.value);
    saveState();
    renderPoseGrid();
    renderOutputs();
    resetResults();
  });

  document.querySelector("#randomizePose").addEventListener("click", () => {
    state.poses = [...libraries.poses].sort(() => Math.random() - 0.5).map(([id]) => id);
    saveState();
    renderPoseGrid();
    renderOutputs();
    resetResults();
  });

  document.querySelector("#generateImages").addEventListener("click", generateAll);
  document.querySelector("#demoGenerate").addEventListener("click", demoGenerateAll);

  document.querySelector("#copyPrompt").addEventListener("click", async () => {
    await navigator.clipboard.writeText(elements.promptOutput.value);
    toast("Prompt 已複製");
  });

  document.querySelector("#copyPosePrompts").addEventListener("click", async () => {
    const text = activePoseIds()
      .map((poseId, index) => `#${index + 1}\n${buildPromptForPose(poseId, index)}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    toast("逐張 prompt 已複製");
  });

  document.querySelector("#copyCaption").addEventListener("click", async () => {
    await navigator.clipboard.writeText(elements.captionOutput.value);
    toast("Caption 已複製");
  });

  document.querySelector("#clearCharacter").addEventListener("click", () => {
    state = { ...defaultState };
    referenceFile = null;
    referenceDataUrl = "";
    localStorage.setItem("factoryState", JSON.stringify(state));
    elements.referencePreview.removeAttribute("src");
    elements.referenceUpload.value = "";
    elements.uploadBox.classList.remove("has-image");
    resetResults();
    hydrate();
    toast("人物卡已重設");
  });

  document.querySelector("#clearSettings").addEventListener("click", () => {
    settings = { ...defaultSettings };
    saveSettings();
    hydrate();
    toast("設定已清除");
  });

  document.querySelector("#clearHistory").addEventListener("click", () => {
    history = [];
    localStorage.removeItem("factoryHistory");
    renderHistory();
    toast("生成歷史已清空");
  });

  elements.resultGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === "download" && results[index]?.dataUrl) {
      downloadDataUrl(results[index].dataUrl, `${safeFilename(state.characterId)}-${index + 1}.png`);
    }
    if (button.dataset.action === "copy-prompt") {
      navigator.clipboard.writeText(results[index]?.prompt || buildPromptForPose(activePoseIds()[index], index));
      toast(`第 ${index + 1} 張 prompt 已複製`);
    }
    if (button.dataset.action === "retry") retryOne(index);
  });

  elements.downloadContactSheet.addEventListener("click", () => {
    if (!currentManifest?.contactSheet) return;
    downloadDataUrl(currentManifest.contactSheet, `${safeFilename(state.characterId)}-${timestamp()}-contact-sheet.png`);
  });

  elements.downloadManifest.addEventListener("click", () => {
    if (!currentManifest) return;
    downloadText(JSON.stringify(currentManifest, null, 2), `${safeFilename(state.characterId)}-${timestamp()}.json`);
  });

  elements.downloadTextPack.addEventListener("click", () => {
    downloadText(buildTextPack(), `${safeFilename(state.characterId)}-${timestamp()}-text-pack.md`, "text/markdown");
  });

  elements.clearResults.addEventListener("click", () => {
    resetResults();
    setStatus("待生成", "結果已清空，可重新生成或匯入素材包。");
    toast("結果已清空");
  });

  elements.manifestImport.addEventListener("change", async () => {
    const file = elements.manifestImport.files[0];
    if (!file) return;
    try {
      const manifest = JSON.parse(await file.text());
      loadManifest(manifest);
    } catch {
      toast("無法讀取素材包 JSON。", true);
    } finally {
      elements.manifestImport.value = "";
    }
  });

  elements.assetPackImport.addEventListener("change", async () => {
    const file = elements.assetPackImport.files[0];
    if (!file) return;
    try {
      importAssetPack(JSON.parse(await file.text()));
    } catch {
      toast("無法讀取 asset-pack JSON。", true);
    } finally {
      elements.assetPackImport.value = "";
    }
  });

  elements.downloadAssetPack.addEventListener("click", () => {
    const pack = buildAssetPack();
    downloadText(JSON.stringify(pack, null, 2), `${safeFilename(pack.name)}-${timestamp()}-asset-pack.json`);
  });

  elements.clearAssetLibrary.addEventListener("click", () => {
    assetLibrary = { ...defaultAssetLibrary, createdAt: new Date().toISOString() };
    saveAssetLibrary();
    state.characterAssetId = "manual";
    state.characterImageType = "manual";
    state.scene = defaultState.scene;
    state.outfit = defaultState.outfit;
    saveState();
    hydrate();
    toast("資產庫已清空");
  });

  elements.googleConnect.addEventListener("click", connectGoogleDrive);
  elements.driveSyncUpload.addEventListener("click", async () => {
    try {
      await uploadAssetPackToDrive();
    } catch (error) {
      setDriveStatus(`同步失敗：${normalizeError(error)}`, "error");
      toast("同步到 Drive 失敗", true);
    }
  });
  elements.driveSyncDownload.addEventListener("click", async () => {
    try {
      await downloadAssetPackFromDrive();
    } catch (error) {
      setDriveStatus(`載入失敗：${normalizeError(error)}`, "error");
      toast("從 Drive 載入失敗", true);
    }
  });

  elements.assetLibraryList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const type = button.dataset.assetType;
    const id = button.dataset.assetId;
    if (type === "character") assetLibrary.characters = assetLibrary.characters.filter((item) => item.id !== id);
    if (type === "scene") assetLibrary.scenes = assetLibrary.scenes.filter((item) => item.id !== id);
    if (type === "outfit") assetLibrary.outfits = assetLibrary.outfits.filter((item) => item.id !== id);
    saveAssetLibrary();
    hydrate();
    toast("資產已刪除");
  });

  document.querySelectorAll("[data-asset-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-asset-tab]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".asset-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.assetTab}AssetPanel`).classList.add("active");
    });
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.tab}Panel`).classList.add("active");
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeDemoImage(index) {
  const pose = optionById("poses", activePoseIds()[index]);
  const scene = optionById("scenes", state.scene);
  const outfit = optionById("outfits", state.outfit);
  const colors = ["#ce4058", "#147d78", "#b27a28", "#41436a", "#1f7a4d", "#7a3767", "#245c73", "#8a4b2a", "#5d6b2f"];
  const bg = colors[index % colors.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#18181b"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <circle cx="512" cy="360" r="132" fill="#f2c7b4"/>
      <path d="M375 315c45-130 230-135 274-5 20 57 8 130-36 171-50-38-143-38-200 0-42-42-58-105-38-166z" fill="#242124"/>
      <path d="M330 790c25-168 100-250 182-250s157 82 182 250H330z" fill="#f7f4ee"/>
      <path d="M365 790c30-118 84-180 147-180s117 62 147 180H365z" fill="${bg}"/>
      <text x="56" y="88" fill="#fff" font-size="42" font-family="Arial" font-weight="700">${state.characterId}</text>
      <text x="56" y="150" fill="#fff" font-size="30" font-family="Arial">${index + 1}. ${pose[1]}</text>
      <text x="56" y="928" fill="#fff" font-size="28" font-family="Arial">${outfit[1]} / ${scene[1]}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

hydrate();
bindControls();
