/**
 * OAuth state token — `<base64url(payload JSON)>.<base64url(HMAC-SHA256(secret, payload))>`.
 *
 * payload = { csrf, nonce, returnTo, iat }.
 *   - csrf  : 16-byte hex random (cookie 동기 비교에 사용)
 *   - nonce : 16-byte hex random (Google OAuth `nonce` param → ID token `nonce` claim 매칭)
 *   - returnTo : safeReturnTo()로 검증된 path (open redirect 방어)
 *   - iat   : 발급 unix epoch ms (만료 검증용)
 *
 * 검증 순서: split('.') → HMAC 재계산 → 일치 → payload JSON.parse → iat 만료 확인.
 */

import { base64urlDecodeString, base64urlEncodeString, base64urlEncode, base64urlDecode } from "./base64url";
import { randomHex } from "./random";
import { safeReturnTo } from "./return-to";

const STATE_TTL_MS = 10 * 60 * 1000; // 10분

export interface StatePayload {
  csrf: string;
  nonce: string;
  returnTo: string;
  iat: number;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return base64urlEncode(new Uint8Array(sig));
}

async function hmacVerify(secret: string, data: string, sigB64: string): Promise<boolean> {
  const key = await importHmacKey(secret);
  const sig = base64urlDecode(sigB64);
  return crypto.subtle.verify(
    "HMAC",
    key,
    sig,
    new TextEncoder().encode(data),
  );
}

export async function createState(
  secret: string,
  returnTo: string,
): Promise<{ state: string; nonce: string; csrf: string }> {
  const csrf = randomHex(16);
  const nonce = randomHex(16);
  const payload: StatePayload = {
    csrf,
    nonce,
    returnTo: safeReturnTo(returnTo),
    iat: Date.now(),
  };
  const payloadB64 = base64urlEncodeString(JSON.stringify(payload));
  const sig = await hmacSign(secret, payloadB64);
  return { state: `${payloadB64}.${sig}`, nonce, csrf };
}

export type VerifyResult =
  | { ok: true; payload: StatePayload }
  | { ok: false; code: "state_invalid" | "state_expired" };

export async function verifyState(secret: string, state: string): Promise<VerifyResult> {
  const dot = state.indexOf(".");
  if (dot < 0) return { ok: false, code: "state_invalid" };
  const payloadB64 = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  if (!payloadB64 || !sig) return { ok: false, code: "state_invalid" };
  const ok = await hmacVerify(secret, payloadB64, sig);
  if (!ok) return { ok: false, code: "state_invalid" };
  let payload: StatePayload;
  try {
    const json = base64urlDecodeString(payloadB64);
    payload = JSON.parse(json);
  } catch {
    return { ok: false, code: "state_invalid" };
  }
  if (
    typeof payload?.csrf !== "string" ||
    typeof payload?.nonce !== "string" ||
    typeof payload?.returnTo !== "string" ||
    typeof payload?.iat !== "number"
  ) {
    return { ok: false, code: "state_invalid" };
  }
  if (Date.now() - payload.iat > STATE_TTL_MS) {
    return { ok: false, code: "state_expired" };
  }
  return { ok: true, payload };
}
