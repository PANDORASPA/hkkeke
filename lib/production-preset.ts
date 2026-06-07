export const PRODUCTION_PRESET_KEY = "ai-girl-generator.pending-production-preset";

export type ProductionPreset = {
  name: string;
  createdAt: string;
  source: "quality-report";
  reviewed: number;
  selected: number;
  keepRate: number;
  form: {
    girlStyle?: string;
    hairStyle?: string;
    hairColor?: string;
    outfit?: string;
    bodyType?: string;
    expression?: string;
    pose?: string;
  };
  factory: {
    extraPrompt?: string;
    seed?: string;
  };
};
