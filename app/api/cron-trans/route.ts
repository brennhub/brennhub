import { CronExpressionParser } from "cron-parser";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { analyze, AI_FALLBACK } from "@/lib/ai/analyze";
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isLocale,
  type Locale,
} from "@/lib/i18n/types";
import { messages } from "@/lib/i18n/messages";

type Mode = "cron-to-natural" | "natural-to-cron";

type TransResponse = {
  cron: string | null;
  explanation: string | null;
  nextRuns: string[];
  error?: string;
};

const SYSTEM_CRON_TO_NATURAL = (locale: Locale) =>
  `You are a cron expression expert. Convert the given cron expression to a single concise natural language sentence describing when it runs.
Standard cron with 5 fields: minute hour day-of-month month day-of-week.
Output ONLY the description sentence, no extra text. Respond in ${LOCALE_NAMES[locale]}.

Examples:
- '0 9 * * 1-5' → '매주 월요일부터 금요일까지 오전 9시 정각에 실행됩니다' (Korean)
- '*/15 * * * *' → 'Runs every 15 minutes' (English)`;

const SYSTEM_NATURAL_TO_CRON = `You convert natural language schedule descriptions into cron expressions.
Standard cron with 5 fields: minute hour day-of-month month day-of-week.
Use * for wildcard, comma for lists, hyphen for ranges, slash for steps.

Output ONLY a valid cron expression on a single line. No explanation, no formatting, no quotes.
If the description is ambiguous, impossible, or not schedulable with cron, output exactly: INVALID

Examples:
- '매일 새벽 3시' → '0 3 * * *'
- '매주 평일 오전 9시' → '0 9 * * 1-5'
- 'every 15 minutes' → '*/15 * * * *'
- '맛있는 음식 추천해줘' → 'INVALID'`;

function nextRunsFor(expr: string): string[] {
  const interval = CronExpressionParser.parse(expr, { tz: "UTC" });
  return interval
    .take(5)
    .map((d) => d.toISOString())
    .filter((s): s is string => typeof s === "string");
}

export async function POST(req: Request) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const t = messages[locale].cronTrans;
      return Response.json({ error: t.invalidJson }, { status: 400 });
    }

    const rawLocale = (body as { locale?: unknown })?.locale;
    if (isLocale(rawLocale)) locale = rawLocale;
    const t = messages[locale].cronTrans;

    const mode = (body as { mode?: unknown })?.mode;
    const input = (body as { input?: unknown })?.input;
    if (mode !== "cron-to-natural" && mode !== "natural-to-cron") {
      return Response.json(
        { error: "Invalid mode." },
        { status: 400 },
      );
    }
    if (typeof input !== "string" || input.trim().length === 0) {
      return Response.json({ error: t.missingInput }, { status: 400 });
    }
    const trimmed = input.trim();
    const validMode = mode as Mode;

    if (validMode === "cron-to-natural") {
      let nextRuns: string[];
      try {
        nextRuns = nextRunsFor(trimmed);
      } catch {
        const empty: TransResponse = {
          cron: null,
          explanation: null,
          nextRuns: [],
          error: t.invalidCronInput,
        };
        return Response.json(empty);
      }

      let explanation: string | null = null;
      try {
        const { env } = getCloudflareContext();
        const result = await analyze({
          env,
          system: SYSTEM_CRON_TO_NATURAL(locale),
          user: trimmed,
        });
        explanation = result === AI_FALLBACK ? null : result.trim() || null;
      } catch (e) {
        console.error("[cron-trans] cron→natural AI failed:", e);
        explanation = null;
      }

      const response: TransResponse = {
        cron: trimmed,
        explanation,
        nextRuns,
      };
      return Response.json(response);
    }

    // natural-to-cron
    let aiOut: string;
    try {
      const { env } = getCloudflareContext();
      aiOut = await analyze({
        env,
        system: SYSTEM_NATURAL_TO_CRON,
        user: trimmed,
      });
    } catch (e) {
      console.error("[cron-trans] natural→cron AI failed:", e);
      const failed: TransResponse = {
        cron: null,
        explanation: null,
        nextRuns: [],
        error: t.aiCouldNotConvert,
      };
      return Response.json(failed);
    }

    if (aiOut === AI_FALLBACK) {
      const failed: TransResponse = {
        cron: null,
        explanation: null,
        nextRuns: [],
        error: t.aiCouldNotConvert,
      };
      return Response.json(failed);
    }

    const firstLine = aiOut.split("\n")[0].trim().replace(/^["'`]|["'`]$/g, "");
    if (firstLine === "INVALID" || firstLine.length === 0) {
      const failed: TransResponse = {
        cron: null,
        explanation: null,
        nextRuns: [],
        error: t.aiCouldNotConvert,
      };
      return Response.json(failed);
    }

    let nextRuns: string[];
    try {
      nextRuns = nextRunsFor(firstLine);
    } catch {
      const failed: TransResponse = {
        cron: null,
        explanation: null,
        nextRuns: [],
        error: t.aiCouldNotConvert,
      };
      return Response.json(failed);
    }

    const response: TransResponse = {
      cron: firstLine,
      explanation: null,
      nextRuns,
    };
    return Response.json(response);
  } catch (err) {
    const e = err as Error;
    return Response.json(
      {
        error: "Unexpected handler error",
        message: e?.message ?? String(err),
        stack: e?.stack ?? null,
      },
      { status: 500 },
    );
  }
}
