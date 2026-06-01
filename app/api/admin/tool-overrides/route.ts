/**
 * /api/admin/tool-overrides — 도구 텍스트 override 목록 (admin only).
 * GET: { rows: [{tool_slug, locale, name, description, updated_at}] }
 * middleware의 admin 가드 통과.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

type Row = {
  tool_slug: string;
  locale: string;
  name: string | null;
  description: string | null;
  updated_at: number;
};

export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return Response.json({ error: "Auth not configured" }, { status: 500 });
  try {
    const result = await db
      .prepare(
        "SELECT tool_slug, locale, name, description, updated_at FROM tool_overrides ORDER BY tool_slug, locale",
      )
      .all<Row>();
    return Response.json({ rows: result.results ?? [] });
  } catch (e) {
    console.error("[tool-overrides GET] DB error:", e);
    return Response.json({ error: "Database query failed" }, { status: 500 });
  }
}
