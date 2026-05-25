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
  modelSelect: document.querySelector("#modelSelect"),
  qualitySelect: document.querySelector("#qualitySelect"),
  sizeSelect: document.querySelector("#sizeSelect"),
  countSelect: document.querySelector("#countSelect"),
  adultConfirm: document.querySelector("#adultConfirm"),
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
  historyList: document.querySelector("#historyList")
};

const defaultState = {
  characterId: "girl-hk-001",
  characterDescription: "香港女生，長髮，五官甜美，身材比例自然，固定面部特徵",
  consistencyNotes: "same face, same identity, consistent body proportion, consistent hairstyle, realistic skin texture",
  scene: "central-pier",
  outfit: "ol",
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
  adultConfirm: false
};

let state = loadObject("factoryState", defaultState);
let settings = loadObject("factorySettings", defaultSettings);
let referenceFile = null;
let referenceDataUrl = "";
let results = [];
let currentManifest = null;
let history = loadArray("factoryHistory");
let isGenerating = false;

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

function optionById(group, id) {
  return libraries[group].find((item) => item[0] === id) || libraries[group][0];
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
  return [
    `Character ID: ${state.characterId}`,
    `Character: ${state.characterDescription}`,
    `Face and identity consistency: ${state.consistencyNotes}`,
    `Scene: ${scene[2]}`,
    `Outfit: ${outfit[2]}`,
    `Emotion: ${mood[2]}`,
    `Photography style: ${style[2]}`,
    "Audience: adult fashion, beauty, hair salon and social media content.",
    "Safety: adult 18+ subject only, tasteful fashion styling, non-explicit, no nudity, no sexual act, no minor-coded appearance.",
    "Quality rules: preserve the same face, age, hairstyle, body proportion, and identity from the reference image. Use realistic anatomy, natural hands, natural skin texture, coherent lighting, and social-media-ready composition. No text, watermark, logo, extra fingers, distorted face, duplicate limbs, or uncanny anatomy."
  ].join("\n");
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
  return `今日造型：${outfit} x ${scene}\n狀態：${mood}\n\n#香港女生 #髮型靈感 #AI寫真 #ootd #hkcontent`;
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
  if (!referenceFile) return "請先上傳人物參考圖。";
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
  const formData = new FormData();
  formData.append("model", settings.model);
  formData.append("image", referenceFile, referenceFile.name || "reference.png");
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
      id: state.characterId,
      description: state.characterDescription,
      consistencyNotes: state.consistencyNotes,
      referenceImage: referenceDataUrl
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

function renderPreflight() {
  const items = [
    ["參考圖", Boolean(referenceFile || referenceDataUrl)],
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
  elements.modelSelect.value = settings.model;
  elements.qualitySelect.value = settings.quality;
  elements.sizeSelect.value = settings.size;
  elements.countSelect.value = String(state.count);
  elements.adultConfirm.checked = Boolean(settings.adultConfirm);
  populateSelect(elements.sceneSelect, "scenes", state.scene);
  populateSelect(elements.outfitSelect, "outfits", state.outfit);
  populateSelect(elements.moodSelect, "moods", state.mood);
  populateSelect(elements.styleSelect, "styles", state.style);
  renderPoseGrid();
  renderOutputs();
  renderResults();
  renderHistory();
  renderPreflight();
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
    resetResults();
    renderPreflight();
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

  [
    ["apiKey", "apiKey"],
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

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
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
