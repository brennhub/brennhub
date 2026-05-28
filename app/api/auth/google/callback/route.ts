/**
 * GET /api/auth/google/callback
 *
 * Google OAuth 콜백:
 * 1. query state ↔ cookie state 정확 일치 (CSRF 1차)
 * 2. state HMAC 검증 + payload(nonce, returnTo, iat) 추출, iat TTL 검증
 * 3. code → tokens 교환 (POST oauth2.googleapis.com/token)
 * 4. id_token RS256 서명 검증 + claims (aud/iss/exp/iat/nonce/email_verified)
 * 5. users upsert (google_sub 기준) → user.id
 * 6. sessions INSERT (id = SHA-256(cookie 평문), expires_at = now+30d)
 * 7. brennhub_session cookie 설정 + auth_state cookie clear → 302 returnTo
 *
 * 에러: 302 → /?auth_error=<code>.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyState } from "@/lib/auth/state";
import { exchangeCodeForTokens } from "@/lib/auth/token-exchange";
import { verifyIdToken } from "@/lib/auth/jwt";
import {
  COOKIE_SESSION,
  COOKIE_STATE,
  clearCookie,
  readCookie,
  serializeCookie,
} from "@/lib/auth/cookie";
import {
  createSession,
  upsertUserByGoogleSub,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/auth/return-to";
import type { AuthErrorCode } from "@/lib/auth/errors";

interface AuthEnv {
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  AUTH_SESSION_SECRET?: string;
  AUTH_DB?: unknown;
}

function errorRedirect(origin: string, code: AuthErrorCode): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location: `${origin}/?auth_error=${code}`,
      // 실패해도 state cookie는 정리
      "set-cookie": clearCookie(COOKIE_STATE),
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const origin = url.origin;

  const { env } = getCloudflareContext();
  const e = env as unknown as AuthEnv;
  if (
    !e.GOOGLE_OAUTH_CLIENT_ID ||
    !e.GOOGLE_OAUTH_CLIENT_SECRET ||
    !e.AUTH_SESSION_SECRET ||
    !e.AUTH_DB
  ) {
    return errorRedirect(origin, "internal");
  }

  const code = url.searchParams.get("code");
  const queryState = url.searchParams.get("state");
  const cookieState = readCookie(req.headers, COOKIE_STATE);
  if (!code || !queryState || !cookieState) {
    return errorRedirect(origin, "state_mismatch");
  }
  if (queryState !== cookieState) {
    return errorRedirect(origin, "state_mismatch");
  }

  // 2. state HMAC + TTL
  const stateRes = await verifyState(e.AUTH_SESSION_SECRET, queryState);
  if (!stateRes.ok) {
    return errorRedirect(origin, stateRes.code);
  }

  // 3. token exchange
  const redirectUri = `${origin}/api/auth/google/callback`;
  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      clientId: e.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: e.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri,
    });
  } catch {
    return errorRedirect(origin, "token_exchange_failed");
  }

  // 4. id_token verify
  const idRes = await verifyIdToken(tokens.id_token, {
    audience: e.GOOGLE_OAUTH_CLIENT_ID,
    expectedNonce: stateRes.payload.nonce,
  });
  if (!idRes.ok) {
    return errorRedirect(origin, idRes.code);
  }

  // 5. users upsert
  const db = e.AUTH_DB as Parameters<typeof upsertUserByGoogleSub>[0];
  let userId: string;
  try {
    userId = await upsertUserByGoogleSub(db, {
      sub: idRes.claims.sub,
      email: idRes.claims.email ?? "",
      name: idRes.claims.name,
      picture: idRes.claims.picture,
    });
  } catch {
    return errorRedirect(origin, "db_error");
  }

  // 6. session 발급
  let cookieValue: string;
  try {
    const sess = await createSession(
      db,
      userId,
      req.headers.get("user-agent"),
    );
    cookieValue = sess.cookieValue;
  } catch {
    return errorRedirect(origin, "db_error");
  }

  // 7. cookie 설정 + redirect
  const returnTo = safeReturnTo(stateRes.payload.returnTo);
  const headers = new Headers();
  headers.set("location", `${origin}${returnTo}`);
  headers.append(
    "set-cookie",
    serializeCookie(COOKIE_SESSION, cookieValue, {
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    }),
  );
  headers.append("set-cookie", clearCookie(COOKIE_STATE));
  return new Response(null, { status: 302, headers });
}
