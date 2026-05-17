import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";
import { messages } from "@/lib/i18n/messages";

const TOOLS = ["site", "email-diag", "cron-trans", "stock-sim"] as const;
const CATEGORIES = ["feature", "improvement", "complaint", "other"] as const;

type Tool = (typeof TOOLS)[number];
type Category = (typeof CATEGORIES)[number];

const MIN_MSG = 5;
const MAX_MSG = 2000;
const MAX_EMAIL = 200;
const RATE_LIMIT_WINDOW_MS = 30_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTool(v: unknown): v is Tool {
  return typeof v === "string" && (TOOLS as readonly string[]).includes(v);
}
function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON", code: "INVALID" },
        { status: 400 },
      );
    }

    const rawLocale = (body as { locale?: unknown })?.locale;
    if (isLocale(rawLocale)) locale = rawLocale;
    const t = messages[locale].feedback;

    const rawTool = (body as { tool?: unknown })?.tool;
    const rawCategory = (body as { category?: unknown })?.category;
    const rawMessage = (body as { message?: unknown })?.message;
    const rawEmail = (body as { email?: unknown })?.email;

    if (!isTool(rawTool)) {
      return Response.json(
        { error: t.errorGeneric, code: "INVALID_TOOL" },
        { status: 400 },
      );
    }
    if (!isCategory(rawCategory)) {
      return Response.json(
        { error: t.errorGeneric, code: "INVALID_CATEGORY" },
        { status: 400 },
      );
    }
    if (typeof rawMessage !== "string") {
      return Response.json(
        { error: t.errorGeneric, code: "INVALID_MESSAGE" },
        { status: 400 },
      );
    }
    const message = rawMessage.trim();
    if (message.length < MIN_MSG) {
      return Response.json(
        { error: t.errorTooShort, code: "TOO_SHORT" },
        { status: 400 },
      );
    }
    if (message.length > MAX_MSG) {
      return Response.json(
        { error: t.errorTooLong, code: "TOO_LONG" },
        { status: 400 },
      );
    }

    let email: string | null = null;
    if (typeof rawEmail === "string" && rawEmail.trim().length > 0) {
      const e = rawEmail.trim();
      if (e.length > MAX_EMAIL || !EMAIL_REGEX.test(e)) {
        return Response.json(
          { error: t.errorGeneric, code: "INVALID_EMAIL" },
          { status: 400 },
        );
      }
      email = e;
    }

    const { env } = getCloudflareContext();
    // D1 binding wired in wrangler.jsonc; cast until cf-typegen runs locally.
    const db = (env as unknown as { DB?: D1Database }).DB;
    if (!db) {
      return Response.json(
        { error: "Database unavailable", code: "DB_UNAVAILABLE" },
        { status: 500 },
      );
    }

    const ipHeader =
      req.headers.get("CF-Connecting-IP") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";
    const ipHash = await sha256Hex(ipHeader);

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const recent = await db
      .prepare(
        "SELECT created_at FROM feedback WHERE ip_hash = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
      )
      .bind(ipHash, windowStart)
      .first<{ created_at: number }>();
    if (recent) {
      return Response.json(
        { error: t.errorRateLimit, code: "RATE_LIMIT" },
        { status: 429 },
      );
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    await db
      .prepare(
        "INSERT INTO feedback (created_at, tool, category, message, email, locale, status, user_agent, ip_hash) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)",
      )
      .bind(
        now,
        rawTool,
        rawCategory,
        message,
        email,
        locale,
        userAgent,
        ipHash,
      )
      .run();

    return Response.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    console.error("[feedback] handler error:", e);
    const t = messages[locale].feedback;
    return Response.json(
      { error: t.errorGeneric, code: "SERVER_ERROR", message: e?.message },
      { status: 500 },
    );
  }
}
