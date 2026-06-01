/**
 * /api/tools/[slug]/visit — 도구별 익명 방문 집계.
 *
 * POST (public): 오늘 (UTC) row count++ INSERT OR REPLACE. user 추적 X.
 *   클라이언트가 sessionStorage로 1회 dedup. 응답: 204.
 * GET  (public): { count } — range 일수 합계. ?range=7|30|all (default 30).
 *
 * Allowlist: tools-registry slug. 미등록 = 400.
 * runtime 명시 없음 (OpenNext + Cloudflare adapter 컨벤션 — BRENNHUB.md § 7).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { tools } from "@/lib/tools-registry";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const TOOL_SLUGS = new Set(tools.map((t) => t.slug));

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function rangeToDays(raw: string | null): number | "all" {
  if (raw === "all") return "all";
  const n = raw ? parseInt(raw, 10) : 30;
  if (Number.isNaN(n) || n <= 0) return 30;
  return Math.min(n, 365);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  const date = todayUTC();
  try {
    await db
      .prepare(
        "INSERT INTO tool_visits (tool_slug, date, count) VALUES (?, ?, 1) " +
          "ON CONFLICT(tool_slug, date) DO UPDATE SET count = count + 1",
      )
      .bind(slug, date)
      .run();
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("[visit POST] DB error:", e);
    return err(500, "Database write failed");
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  const url = new URL(req.url);
  const days = rangeToDays(url.searchParams.get("range"));

  try {
    let row;
    if (days === "all") {
      row = await db
        .prepare("SELECT COALESCE(SUM(count), 0) as c FROM tool_visits WHERE tool_slug = ?")
        .bind(slug)
        .first<{ c: number }>();
    } else {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      row = await db
        .prepare(
          "SELECT COALESCE(SUM(count), 0) as c FROM tool_visits WHERE tool_slug = ? AND date >= ?",
        )
        .bind(slug, since)
        .first<{ c: number }>();
    }
    return Response.json({ count: row?.c ?? 0 });
  } catch (e) {
    console.error("[visit GET] DB error:", e);
    return err(500, "Database query failed");
  }
}
