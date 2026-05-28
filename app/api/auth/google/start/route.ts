/**
 * GET /api/auth/google/start
 *
 * - query: ?return_to=<path> (optional, default "/")
 * - state token 발급(HMAC) + auth_state cookie 설정
 * - 302 → Google OAuth authorize URL
 *
 * runtime 명시 없음 — BRENNHUB.md § 7 (OpenNext + Cloudflare adapter 미지원).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createState } from "@/lib/auth/state";
import { buildGoogleAuthorizeUrl } from "@/lib/auth/oauth-url";
import { COOKIE_STATE, serializeCookie } from "@/lib/auth/cookie";
import { safeReturnTo } from "@/lib/auth/return-to";

interface AuthEnv {
  GOOGLE_OAUTH_CLIENT_ID?: string;
  AUTH_SESSION_SECRET?: string;
}

export async function GET(req: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const e = env as unknown as AuthEnv;
  if (!e.GOOGLE_OAUTH_CLIENT_ID || !e.AUTH_SESSION_SECRET) {
    return Response.json(
      { error: "Auth not configured", code: "internal" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get("return_to"));
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const { state, nonce } = await createState(e.AUTH_SESSION_SECRET, returnTo);
  const authorizeUrl = buildGoogleAuthorizeUrl({
    clientId: e.GOOGLE_OAUTH_CLIENT_ID,
    redirectUri,
    state,
    nonce,
  });

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizeUrl,
      "set-cookie": serializeCookie(COOKIE_STATE, state, {
        maxAgeSeconds: 600,
      }),
    },
  });
}
