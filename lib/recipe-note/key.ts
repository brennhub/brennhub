/**
 * 숏링크 키 · 수정 토큰 생성 (기획서 §3, §5).
 *
 * - `key` — base62 8자. 62^8 ≈ 2.18e14. 공개 URL에 노출된다.
 * - `editToken` — base62 24자 (≈ 143비트). 생성자 localStorage에만 남는
 *   사실상의 인증 수단이므로 **modulo bias 없이** 뽑는다 (거부 샘플링).
 *
 * Web Crypto만 쓴다 — Workers·브라우저 양쪽에서 같은 코드가 돈다.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const KEY_LEN = 8;
export const EDIT_TOKEN_LEN = 24;

/** 256을 62로 나눈 나머지 구간(248~255)은 버린다 — 균등 분포 보장. */
const REJECT_THRESHOLD = 256 - (256 % ALPHABET.length);

function randomBase62(length: number): string {
  let out = "";
  while (out.length < length) {
    const buf = new Uint8Array(length - out.length + 8);
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= REJECT_THRESHOLD) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function generateKey(): string {
  return randomBase62(KEY_LEN);
}

export function generateEditToken(): string {
  return randomBase62(EDIT_TOKEN_LEN);
}

function isBase62(value: unknown, length: number): value is string {
  if (typeof value !== "string" || value.length !== length) return false;
  for (let i = 0; i < value.length; i += 1) {
    if (!ALPHABET.includes(value[i])) return false;
  }
  return true;
}

/** URL 세그먼트 가드 — D1 조회 전에 형식부터 거른다. */
export function isValidKey(value: unknown): value is string {
  return isBase62(value, KEY_LEN);
}

export function isValidEditToken(value: unknown): value is string {
  return isBase62(value, EDIT_TOKEN_LEN);
}

/**
 * 수정 토큰 비교 — 길이가 같을 때 상수 시간에 비교한다.
 * D1 왕복 지연이 지배적이라 실효 타이밍 공격은 비현실적이지만,
 * 토큰 비교에 `===`를 쓰지 않는 습관을 코드에 남겨 둔다.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
