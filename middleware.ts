/**
 * /admin* + /api/admin/* 보호 — OAuth 세션 + is_admin 검증.
 * (1-A 2026-05-27: Basic Auth 폐기 → Google OAuth로 전환.)
 *
 * Page (`/admin/*`):
 *   - 세션 없음/만료/무효 → 302 → /api/auth/google/start?return_to=<path>
 *   - 로그인 OK + is_admin=0 → 302 → /?auth_error=not_admin (AuthErrorToast가 처리)
 *   - AUTH_DB 미바인딩 → 302 → /?auth_error=internal (fail closed)
 *
 * API (`/api/admin/*`):
 *   - 세션 없음/만료/무효 → 401 JSON
 *   - 로그인 OK + is_admin=0 → 403 JSON
 *   - AUTH_DB 미바인딩 → 500 JSON
 *
 * Edge runtime — `getCloudflareContext()`로 AUTH_DB 접근. SHA-256(cookie) → sessions JOIN users.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE_SESSION = "brennhub_session";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const arr = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function parseSessionCookie(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === COOKIE_SESSION) return v;
  }
  return null;
}

function redirectLogin(url: URL): NextResponse {
  const returnTo = encodeURIComponent(url.pathname + url.search);
  return NextResponse.redirect(
    `${url.origin}/api/auth/google/start?return_to=${returnTo}`,
  );
}

function redirectAuthError(url: URL, code: string): NextResponse {
  return NextResponse.redirect(`${url.origin}/?auth_error=${code}`);
}

function jsonError(status: number, error: string): NextResponse {
  return new NextResponse(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const isApi = url.pathname.startsWith("/api/");

  const cookieValue = parseSessionCookie(req.headers.get("cookie"));
  if (!cookieValue) {
    return isApi ? jsonError(401, "Unauthorized") : redirectLogin(url);
  }

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) {
    return isApi
      ? jsonError(500, "Auth not configured")
      : redirectAuthError(url, "internal");
  }

  const sessionId = await sha256Hex(cookieValue);
  let row: { is_admin: number } | null;
  try {
    row = await db
      .prepare(
        "SELECT u.is_admin AS is_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?",
      )
      .bind(sessionId, Date.now())
      .first<{ is_admin: number }>();
  } catch {
    return isApi
      ? jsonError(500, "Database query failed")
      : redirectAuthError(url, "internal");
  }

  if (!row) {
    // 만료·무효 세션 → 비로그인과 동일 처리
    return isApi ? jsonError(401, "Unauthorized") : redirectLogin(url);
  }
  if (row.is_admin !== 1) {
    return isApi
      ? jsonError(403, "Forbidden")
      : redirectAuthError(url, "not_admin");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
