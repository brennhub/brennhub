/**
 * Google ID token 검증.
 * - RS256 서명 검증 (JWKS에서 kid 매칭)
 * - claims: aud / iss / exp / iat / nonce / email_verified
 *
 * ⚠️ 본 검증 누락 = 토큰 위조 가능. 자체 구현의 최대 위험 — 변경 시 jwt.test.ts 회귀 필수.
 */

import { base64urlDecode, base64urlDecodeString } from "./base64url";
import { getJwksKey } from "./jwks-cache";

export interface IdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

const ALLOWED_ISS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);

const CLOCK_SKEW_SEC = 5 * 60; // iat 5분 미래까지 허용

export type VerifyResult =
  | { ok: true; claims: IdTokenClaims }
  | { ok: false; code: "id_token_invalid" | "id_token_unverified_email" };

export interface VerifyOptions {
  audience: string;     // GOOGLE_OAUTH_CLIENT_ID
  expectedNonce: string;
  // verify 시점의 unix epoch sec (테스트 주입용)
  now?: number;
  // PoC 테스트 모드: 외부 JWKS 대신 주어진 키로 검증
  jwksOverride?: (kid: string) => Promise<CryptoKey | null>;
}

export async function verifyIdToken(
  idToken: string,
  opts: VerifyOptions,
): Promise<VerifyResult> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return { ok: false, code: "id_token_invalid" };
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg: string; kid?: string; typ?: string };
  let claims: IdTokenClaims;
  try {
    header = JSON.parse(base64urlDecodeString(headerB64));
    claims = JSON.parse(base64urlDecodeString(payloadB64));
  } catch {
    return { ok: false, code: "id_token_invalid" };
  }

  if (header.alg !== "RS256" || !header.kid) {
    return { ok: false, code: "id_token_invalid" };
  }

  const getKey = opts.jwksOverride ?? getJwksKey;
  const key = await getKey(header.kid);
  if (!key) return { ok: false, code: "id_token_invalid" };

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = base64urlDecode(sigB64);
  const sigOk = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    sig,
    data,
  );
  if (!sigOk) return { ok: false, code: "id_token_invalid" };

  // claims 검증
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (typeof claims.iss !== "string" || !ALLOWED_ISS.has(claims.iss)) {
    return { ok: false, code: "id_token_invalid" };
  }
  const audOk = Array.isArray(claims.aud)
    ? claims.aud.includes(opts.audience)
    : claims.aud === opts.audience;
  if (!audOk) return { ok: false, code: "id_token_invalid" };
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    return { ok: false, code: "id_token_invalid" };
  }
  if (typeof claims.iat !== "number" || claims.iat > now + CLOCK_SKEW_SEC) {
    return { ok: false, code: "id_token_invalid" };
  }
  if (claims.nonce !== opts.expectedNonce) {
    return { ok: false, code: "id_token_invalid" };
  }
  if (typeof claims.sub !== "string" || !claims.sub) {
    return { ok: false, code: "id_token_invalid" };
  }
  if (claims.email_verified !== true) {
    return { ok: false, code: "id_token_unverified_email" };
  }
  return { ok: true, claims };
}
