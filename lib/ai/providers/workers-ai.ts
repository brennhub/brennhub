import type { AnalyzeOpts } from "../analyze";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function workersAiAnalyze({
  system,
  user,
  env,
}: AnalyzeOpts): Promise<string> {
  const res = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text =
    typeof res === "string"
      ? res
      : ((res as { response?: string }).response ?? "");
  if (!text.trim()) throw new Error("Workers AI returned empty response");
  return text.trim();
}
