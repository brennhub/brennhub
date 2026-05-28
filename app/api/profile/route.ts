/**
 * PUT /api/profile — 표시 이름(display_name) 변경.
 *
 * 인증: 본 route 자체 getUserFromHeaders (user_id는 세션에서 결정).
 * body: { display_name: string } — trim 후 1~50자. 빈 문자열 → null (Google 이름 복원).
 *
 * runtime 명시 없음 (OpenNext + Cloudflare adapter 컨벤션 — BRENNHUB.md § 7).
 */

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromHeaders, updateDisplayName } from "@/lib/auth/session";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const MAX_LEN = 50;

export async function PUT(req: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return Response.json({ error: "Auth not configured" }, { status: 500 });

  const h = await headers();
  const user = await getUserFromHeaders(db, h as unknown as Headers);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body as { display_name?: unknown })?.display_name;
  if (typeof raw !== "string") {
    return Response.json({ error: "display_name required" }, { status: 400 });
  }
  const trimmed = raw.trim();
  if (trimmed.length > MAX_LEN) {
    return Response.json({ error: "Too long" }, { status: 400 });
  }
  const value = trimmed.length === 0 ? null : trimmed;

  try {
    await updateDisplayName(db, user.id, value);
  } catch (e) {
    console.error("[profile PUT] DB error:", e);
    return Response.json({ error: "Database write failed" }, { status: 500 });
  }

  return Response.json({ display_name: value });
}
