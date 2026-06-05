import { NEGATIVE_PROMPT, QUALITY_PROMPT } from "./options";
import { DriveAsset, GeneratePayload } from "./types";

export type PromptReferences = {
  scene?: DriveAsset | null;
  extras?: DriveAsset[];
};

// 參考圖會在 OpenAI Images Edits route 以 image[] 傳入；
// 這裡同時把檔名/分類寫入 prompt，令模型更清楚每張參考圖用途。
export function buildPrompt(
  payload: GeneratePayload,
  references?: PromptReferences
) {
  const lines: string[] = [];

  if (references?.scene) {
    const sceneLabel = references.scene.sub_category || references.scene.file_name || "selected scene";
    lines.push(`Use the uploaded scene image as the background reference (scene: ${sceneLabel}).`);
  } else {
    lines.push("Use the uploaded scene image as the background reference.");
  }

  lines.push("Create one young adult East Asian woman in the scene.");
  lines.push("Do not imitate a real private person; create a new fictional adult character.");
  lines.push(
    "She should have a different face, different hairstyle, different hair color, different outfit and different expression."
  );
  lines.push(`Style: ${payload.girlStyle} Hong Kong girl.`);
  lines.push(`Hair: ${payload.hairColor} ${payload.hairStyle}.`);
  lines.push(`Outfit: ${payload.outfit}.`);
  lines.push(`Body type: ${payload.bodyType}.`);
  lines.push(`Expression: ${payload.expression}.`);
  lines.push(`Pose: ${payload.pose} casually.`);
  lines.push("Make it look like a real candid street photo.");
  lines.push(QUALITY_PROMPT);
  lines.push("Keep the scene realistic and avoid fake unreadable text in the background.");
  lines.push(`Avoid: ${NEGATIVE_PROMPT}.`);

  if (references?.extras?.length) {
    for (const ref of references.extras) {
      if (!ref.file_name) continue;
      const categoryHint = categoryHintFor(ref.category);
      lines.push(`Additional ${categoryHint} reference image: "${ref.file_name}".`);
    }
  }

  const extra = payload.extraPrompt?.trim();
  if (extra) lines.push(`Extra direction: ${extra}`);

  return lines.filter(Boolean).join("\n");
}

function categoryHintFor(category?: string | null) {
  switch (category) {
    case "outfit":
      return "outfit/clothing";
    case "hair":
      return "hairstyle";
    case "pose":
      return "pose/posture";
    case "girl":
      return "fictional adult character";
    default:
      return "visual";
  }
}

export function getNegativePrompt() {
  return NEGATIVE_PROMPT;
}
