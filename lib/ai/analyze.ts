import { workersAiAnalyze } from "./providers/workers-ai";
import { anthropicAnalyze } from "./providers/anthropic";

export type AnalyzeOpts = {
  system: string;
  user: string;
  env: CloudflareEnv;
};

export const AI_FALLBACK = "AI 분석을 일시적으로 가져오지 못했습니다.";

export async function analyze(opts: AnalyzeOpts): Promise<string> {
  try {
    const provider = (opts.env.AI_PROVIDER as string) ?? "workers-ai";
    switch (provider) {
      case "anthropic":
        return await anthropicAnalyze(opts);
      case "workers-ai":
      default:
        return await workersAiAnalyze(opts);
    }
  } catch (e) {
    console.error("[ai/analyze] failed:", e);
    return AI_FALLBACK;
  }
}
