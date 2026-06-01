/**
 * /api/admin/tool-overrides/[slug]?locale=ko|en — 단일 override 편집 (admin only).
 * PUT: body { name?, description? } — null 값은 컬럼 null로. INSERT OR REPLACE.
 * DELETE: 해당 row 삭제 (default 복귀).
 * Allowlist: tools-registry slug. locale = 'ko' | 'en'.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { tools } from "@/lib/tools-registry";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const TOOL_SLUGS = new Set(tools.map((t) => t.slug));
const VALID_LOCALES = new Set(["ko", "en"]);

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function readLocale(req: Request): string | null {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale");
  if (!locale || !VALID_LOCALES.has(locale)) return null;
  return locale;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");
  const locale = readLocale(req);
  if (!locale) return err(400, "Invalid locale");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  let body: { name?: string | null; description?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return err(400, "Invalid JSON");
  }

  const name = body.name?.trim() || null;
  const description = body.description?.trim() || null;
  const now = Date.now();

  try {
    await db
      .prepare(
        "INSERT INTO tool_overrides (tool_slug, locale, name, description, updated_at) VALUES (?, ?, ?, ?, ?) " +
          "ON CONFLICT(tool_slug, locale) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at",
      )
      .bind(slug, locale, name, description, now)
      .run();
    return Response.json({ updated_at: now });
  } catch (e) {
    console.error("[tool-overrides PUT] DB error:", e);
    return err(500, "Database write failed");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");
  const locale = readLocale(req);
  if (!locale) return err(400, "Invalid locale");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  try {
    await db
      .prepare("DELETE FROM tool_overrides WHERE tool_slug = ? AND locale = ?")
      .bind(slug, locale)
      .run();
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("[tool-overrides DELETE] DB error:", e);
    return err(500, "Database delete failed");
  }
}
