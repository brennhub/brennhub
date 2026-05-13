import type { AnalyzeOpts } from "../analyze";

export async function anthropicAnalyze(_opts: AnalyzeOpts): Promise<string> {
  throw new Error(
    "Anthropic provider not configured yet — coming when needed",
  );
}
