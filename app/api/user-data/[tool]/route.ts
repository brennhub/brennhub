/**
 * /api/user-data/[tool] — 도구별 사용자 데이터 CRUD.
 *
 * 인증: 본 route 자체에서 `getUserFromHeaders` 검증 (middleware는 admin 전용 유지).
 * Allowlist: tools-registry slug. 미등록 tool = 400.
 * 보안: user_id는 세션에서 결정 — 클라이언트가 임의 user_id 못 보냄.
 *
 * GET:    { data: <parsed JSON>|null, updated_at?: number }
 * PUT:    body = any JSON → { updated_at } (INSERT OR REPLACE)
 * DELETE: 204 (멱등)
 *
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

// stock-sim은 4개 계산기를 슬러그 분리로 저장 (tool=stock-sim:<sub>, D1 row 독립).
// registry엔 'stock-sim'만 두고, 서브 슬러그는 여기서 명시 허용 (매핑 (b)).
const STOCK_SIM_SUB_SLUGS = new Set([
  "stock-sim:cost-basis",
  "stock-sim:dca-down",
  "stock-sim:dividend",
  "stock-sim:split-sell",
]);

// Hub 자체 사용자 데이터 (registry slug 아님). 즐겨찾기 등.
const HUB_DATA_SLUGS = new Set(["hub-favorites"]);

async function resolveAuth(): Promise<
  | { ok: true; userId: string; db: D1Database }
  | { ok: false; status: number; error: string }
> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return { ok: false, status: 500, error: "Auth not configured" };
  const h = await headers();
  const user = await getUserFromHeaders(db, h as unknown as Headers);
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, userId: user.id, db };
}

function validateTool(tool: string): boolean {
  return (
    TOOL_SLUGS.has(tool) ||
    STOCK_SIM_SUB_SLUGS.has(tool) ||
    HUB_DATA_SLUGS.has(tool)
  );
}

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tool: string }> },
): Promise<Response> {
  const { tool } = await params;
  if (!validateTool(tool)) return err(400, "Unknown tool");
  const auth = await resolveAuth();
  if (!auth.ok) return err(auth.status, auth.error);

  try {
    const row = await auth.db
      .prepare(
        "SELECT data, updated_at FROM user_data WHERE user_id = ? AND tool = ?",
      )
      .bind(auth.userId, tool)
      .first<{ data: string; updated_at: number }>();
    if (!row) return Response.json({ data: null });
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      // DB에 비정상 JSON이 들어가 있는 케이스 — null로 처리, 로그.
      console.error("[user-data] invalid JSON in DB:", { tool, userId: auth.userId });
      return Response.json({ data: null });
    }
    return Response.json({ data: parsed, updated_at: row.updated_at });
  } catch (e) {
    console.error("[user-data GET] DB error:", e);
    return err(500, "Database query failed");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tool: string }> },
): Promise<Response> {
  const { tool } = await params;
  if (!validateTool(tool)) return err(400, "Unknown tool");
  const auth = await resolveAuth();
  if (!auth.ok) return err(auth.status, auth.error);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON");
  }
  const dataStr = JSON.stringify(body);
  const now = Date.now();

  try {
    await auth.db
      .prepare(
        "INSERT INTO user_data (user_id, tool, data, updated_at) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(user_id, tool) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      )
      .bind(auth.userId, tool, dataStr, now)
      .run();
    return Response.json({ updated_at: now });
  } catch (e) {
    console.error("[user-data PUT] DB error:", e);
    return err(500, "Database write failed");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tool: string }> },
): Promise<Response> {
  const { tool } = await params;
  if (!validateTool(tool)) return err(400, "Unknown tool");
  const auth = await resolveAuth();
  if (!auth.ok) return err(auth.status, auth.error);

  try {
    await auth.db
      .prepare("DELETE FROM user_data WHERE user_id = ? AND tool = ?")
      .bind(auth.userId, tool)
      .run();
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("[user-data DELETE] DB error:", e);
    return err(500, "Database delete failed");
  }
}
