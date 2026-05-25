import { GeneratePayload } from "./types";
import { NEGATIVE_PROMPT, QUALITY_PROMPT } from "./options";

export function buildPrompt(payload: GeneratePayload) {
  const extra = payload.extraPrompt?.trim();

  return [
    "Use the uploaded scene image as the background reference.",
    "Create one young adult East Asian woman in the scene.",
    "She should have a different face, different hairstyle, different hair color, different outfit and different expression.",
    `Style: ${payload.girlStyle} Hong Kong girl.`,
    `Hair: ${payload.hairColor} ${payload.hairStyle}.`,
    `Outfit: ${payload.outfit}.`,
    `Body type: ${payload.bodyType}.`,
    `Expression: ${payload.expression}.`,
    `Pose: ${payload.pose} casually.`,
    "Make it look like a real candid street photo.",
    QUALITY_PROMPT,
    "Keep the scene realistic and avoid fake unreadable text in the background.",
    extra ? `Extra direction: ${extra}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function getNegativePrompt() {
  return NEGATIVE_PROMPT;
}
