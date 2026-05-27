/**
 * POST /api/auth/logout
 *
 * - 세션 cookie SHA-256 → D1 sessions DELETE
 * - cookie clear → 302 → /
 *
 * GET 미허용 — 브라우저 prefetch / 외부 링크 클릭으로 의도 외 로그아웃 방어.
 * UI(1-C)는 form submit으로 호출.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  COOKIE_SESSION,
  clearCookie,
  readCookie,
} from "@/lib/auth/cookie";
import { destroySessionByCookie } from "@/lib/auth/session";

interface AuthEnv {
  AUTH_DB?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = new Headers({ location: `${url.origin}/` });
  headers.append("set-cookie", clearCookie(COOKIE_SESSION));

  const cookieValue = readCookie(req.headers, COOKIE_SESSION);
  if (cookieValue) {
    const { env } = getCloudflareContext();
    const e = env as unknown as AuthEnv;
    if (e.AUTH_DB) {
      const db = e.AUTH_DB as Parameters<typeof destroySessionByCookie>[0];
      try {
        await destroySessionByCookie(db, cookieValue);
      } catch {
        // 세션 삭제 실패해도 cookie clear는 진행 (사용자 입장 로그아웃 완료)
      }
    }
  }

  return new Response(null, { status: 302, headers });
}
