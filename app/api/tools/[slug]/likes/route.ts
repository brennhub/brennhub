/**
 * /api/tools/[slug]/likes — 도구별 좋아요 카운트 + 토글.
 *
 * GET (public): { count, liked } — 비로그인이면 liked=false, count는 그대로 노출.
 * PUT (auth): toggle. 응답 동일.
 *
 * 인증: route 자체에서 getUserFromHeaders 검증. PUT은 로그인 필수 (401).
 * Allowlist: tools-registry slug. 미등록 = 400.
 * runtime 명시 없음 (OpenNext + Cloudflare adapter 컨벤션 — BRENNHUB.md § 7).
 */

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromHeaders } from "@/lib/auth/session";
import { tools } from "@/lib/tools-registry";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const TOOL_SLUGS = new Set(tools.map((t) => t.slug));

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

async function getCounts(
  db: D1Database,
  slug: string,
  userId: string | null,
): Promise<{ count: number; liked: boolean }> {
  const countRow = await db
    .prepare("SELECT COUNT(*) as c FROM tool_likes WHERE tool_slug = ?")
    .bind(slug)
    .first<{ c: number }>();
  const count = countRow?.c ?? 0;
  if (!userId) return { count, liked: false };
  const mine = await db
    .prepare(
      "SELECT 1 FROM tool_likes WHERE user_id = ? AND tool_slug = ? LIMIT 1",
    )
    .bind(userId, slug)
    .first();
  return { count, liked: !!mine };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  const h = await headers();
  const user = await getUserFromHeaders(db, h as unknown as Headers);

  try {
    const result = await getCounts(db, slug, user?.id ?? null);
    return Response.json(result);
  } catch (e) {
    console.error("[likes GET] DB error:", e);
    return err(500, "Database query failed");
  }
}

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  const h = await headers();
  const user = await getUserFromHeaders(db, h as unknown as Headers);
  if (!user) return err(401, "Login required");

  try {
    const existing = await db
      .prepare(
        "SELECT 1 FROM tool_likes WHERE user_id = ? AND tool_slug = ? LIMIT 1",
      )
      .bind(user.id, slug)
      .first();
    if (existing) {
      await db
        .prepare(
          "DELETE FROM tool_likes WHERE user_id = ? AND tool_slug = ?",
        )
        .bind(user.id, slug)
        .run();
    } else {
      await db
        .prepare(
          "INSERT INTO tool_likes (user_id, tool_slug, created_at) VALUES (?, ?, ?)",
        )
        .bind(user.id, slug, Date.now())
        .run();
    }
    const result = await getCounts(db, slug, user.id);
    return Response.json(result);
  } catch (e) {
    console.error("[likes PUT] DB error:", e);
    return err(500, "Database write failed");
  }
}
