import type { MazeProject } from "./types";
import { migrateSharedPayload } from "./storage";

/**
 * 숏링크 공유 헬퍼 (P4a).
 *
 * - `generateShortId()` — 6자 알파넘 (36^6 ≈ 2.2B). 10만 미로 시 충돌율 ~0.002%.
 *   API route가 충돌 감지 시 1회 retry.
 * - `parseSharedPayload(payload)` — D1 row의 JSON 문자열을 파싱·migrate.
 *   숏링크는 영구 스냅샷이므로 구 schema 데이터도 migrate 통과시켜야 함.
 *   try/catch + null fallback — 손상 row(POST 검증이 막지만 방어).
 * - `isValidPayload(value)` — POST 시점 검증 (API route용). migrate 통과 가능한지 확인.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const SHORT_ID_LEN = 6;

/**
 * Web Crypto getRandomValues로 6자 알파넘 id.
 * Workers·브라우저 양쪽 지원. modulo bias 약간(256%36=4)이나 충돌율 대비 무시.
 */
export function generateShortId(): string {
  const buf = new Uint8Array(SHORT_ID_LEN);
  crypto.getRandomValues(buf);
  let id = "";
  for (let i = 0; i < SHORT_ID_LEN; i += 1) {
    id += ALPHABET[buf[i] % ALPHABET.length];
  }
  return id;
}

/** id 형식 검증 — API GET/POST 입력 가드. */
export function isValidShortId(id: unknown): id is string {
  if (typeof id !== "string" || id.length !== SHORT_ID_LEN) return false;
  for (let i = 0; i < id.length; i += 1) {
    if (!ALPHABET.includes(id[i])) return false;
  }
  return true;
}

/**
 * D1 payload(JSON 문자열) → MazeProject. 손상·구 schema·grid empty 모두 null.
 * server component(page.tsx)에서 직접 호출 가능 (순수 함수).
 */
export function parseSharedPayload(payload: string): MazeProject | null {
  try {
    const raw: unknown = JSON.parse(payload);
    return migrateSharedPayload(raw);
  } catch {
    return null;
  }
}

/** POST 입력 검증 — 클라이언트가 보낸 MazeProject가 migrate 통과 가능한지. */
export function isValidPayload(value: unknown): value is MazeProject {
  return migrateSharedPayload(value) !== null;
}
