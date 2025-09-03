import { performFictionAssessment } from '../fictionAssessment';

type Args = { text: string; provider: "zhi1" | string; preview: boolean };

function mapZhiToProvider(zhiName: string): string {
  const mapping: { [key: string]: string } = {
    'zhi1': 'openai',
    'zhi2': 'anthropic', 
    'zhi3': 'deepseek',
    'zhi4': 'perplexity'
  };
  return mapping[zhiName] || zhiName;
}

export async function assessFiction({ text, provider, preview }: Args) {
  try {
    // Map zhi providers to actual providers
    const actualProvider = mapZhiToProvider(provider);
    
    // Call existing fiction assessment logic
    const result = await performFictionAssessment(text, actualProvider);
    
    // Convert to expected format
    if (!result || typeof result !== "object") {
      return fallback("EMPTY_RESULT");
    }
    
    return sanitize(result);
  } catch (e: any) {
    console.warn("[FICTION] provider error:", e?.message ?? e);
    return fallback(e?.message ?? "PROVIDER_ERROR");
  }
}

function sanitize(r: any) {
  return {
    scores: {
      worldCoherence: r.worldCoherence ?? 0,
      emotionalPlausibility: r.emotionalPlausibility ?? 0,
      thematicDepth: r.thematicDepth ?? 0,
      narrativeStructure: r.narrativeStructure ?? 0,
      proseControl: r.proseControl ?? 0,
      overallFictionScore: r.overallFictionScore ?? 0
    },
    summary: typeof r.detailedAssessment === "string" ? r.detailedAssessment : "",
    quotes: [],
  };
}

function fallback(reason: string) {
  return {
    scores: {
      worldCoherence: 0,
      emotionalPlausibility: 0,
      thematicDepth: 0,
      narrativeStructure: 0,
      proseControl: 0,
      overallFictionScore: 0
    },
    summary: `Fiction preview unavailable (${reason}).`,
    quotes: [],
  };
}