/**
 * DELETE /api/account — 계정 영구 삭제 (비가역).
 *
 * 인증: 본 route 자체 getUserFromHeaders (user_id는 세션에서 결정).
 * 삭제: user_data + sessions + users 명시적 batch (CASCADE 비의존, 원자적).
 * 응답: brennhub_session cookie clear + 200. 클라이언트는 홈으로 full reload.
 *
 * GET 미허용 — prefetch / 외부 링크로 의도 외 삭제 방어 (logout과 동일 정책).
 */

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromHeaders, deleteAccount } from "@/lib/auth/session";
import { COOKIE_SESSION, clearCookie } from "@/lib/auth/cookie";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

export async function DELETE(): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return Response.json({ error: "Auth not configured" }, { status: 500 });

  const h = await headers();
  const user = await getUserFromHeaders(db, h as unknown as Headers);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteAccount(
      db as unknown as Parameters<typeof deleteAccount>[0],
      user.id,
    );
  } catch (e) {
    console.error("[account DELETE] DB error:", e);
    return Response.json({ error: "Database delete failed" }, { status: 500 });
  }

  return new Response(null, {
    status: 200,
    headers: { "set-cookie": clearCookie(COOKIE_SESSION) },
  });
}
