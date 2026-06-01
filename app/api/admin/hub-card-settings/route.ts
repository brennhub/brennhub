/**
 * /api/admin/hub-card-settings — Hub 카드 전역 설정 (singleton, admin only).
 * GET: { description_lines, padding_bottom, updated_at }
 * PUT: body { description_lines?, padding_bottom? } — INSERT OR REPLACE on id=1.
 *      범위 검증: description_lines 2..8, padding_bottom 16..96.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const DEFAULT_LINES = 3;
const DEFAULT_PB = 40;
const LINES_MIN = 2;
const LINES_MAX = 8;
const PB_MIN = 16;
const PB_MAX = 96;

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");
  try {
    const row = await db
      .prepare(
        "SELECT description_lines, padding_bottom, updated_at FROM hub_card_settings WHERE id = 1",
      )
      .first<{
        description_lines: number;
        padding_bottom: number;
        updated_at: number;
      }>();
    if (!row) {
      return Response.json({
        description_lines: DEFAULT_LINES,
        padding_bottom: DEFAULT_PB,
        updated_at: 0,
      });
    }
    return Response.json(row);
  } catch (e) {
    console.error("[hub-card-settings GET] DB error:", e);
    return err(500, "Database query failed");
  }
}

export async function PUT(req: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  let body: { description_lines?: number; padding_bottom?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return err(400, "Invalid JSON");
  }

  const lines = clamp(
    Number(body.description_lines ?? DEFAULT_LINES),
    LINES_MIN,
    LINES_MAX,
  );
  const pb = clamp(
    Number(body.padding_bottom ?? DEFAULT_PB),
    PB_MIN,
    PB_MAX,
  );
  const now = Date.now();

  try {
    await db
      .prepare(
        "INSERT INTO hub_card_settings (id, description_lines, padding_bottom, updated_at) VALUES (1, ?, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET description_lines = excluded.description_lines, padding_bottom = excluded.padding_bottom, updated_at = excluded.updated_at",
      )
      .bind(lines, pb, now)
      .run();
    return Response.json({ description_lines: lines, padding_bottom: pb, updated_at: now });
  } catch (e) {
    console.error("[hub-card-settings PUT] DB error:", e);
    return err(500, "Database write failed");
  }
}
