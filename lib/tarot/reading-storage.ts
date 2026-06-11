/**
 * 마지막 리딩 1건 localStorage 저장 — PATTERNS.md hydrate/persist/schemaVersion.
 * 봉인 원본(order·nonce·pickedIndices·choice)을 통째로 저장해 재방문 후에도
 * S8 '검증' 토글이 동작한다. 질문 포함 — 기기 내에만, 네트워크 미전송.
 */

import type { Domain } from "./types";
import { DOMAINS } from "./types";
import { DECK_SIZE } from "./ritual-state";

export const READING_STORAGE_KEY = "brennhub-tarot-last-reading";
export const READING_SCHEMA_VERSION = 1;

export type SavedReading = {
  schemaVersion: typeof READING_SCHEMA_VERSION;
  savedAt: string; // ISO
  question: string;
  domain: Domain;
  /** 뽑힌 카드 id 3개 — order[pickedIndices[k]]와 일치해야 유효 (로드 시 검사). */
  cardIds: readonly number[];
  choice: "upright" | "reversed";
  /** 봉인 원본 — 검증 토글 재계산용. */
  order: readonly number[]; // 22
  nonce: string;
  hash: string;
  pickedIndices: readonly number[]; // 3
};

/** 스키마·일관성 검사 — 손상/구버전/조작된 데이터는 null (조용히 폐기). */
function isValid(r: unknown): r is SavedReading {
  if (typeof r !== "object" || r === null) return false;
  const v = r as Record<string, unknown>;
  if (v.schemaVersion !== READING_SCHEMA_VERSION) return false;
  if (typeof v.question !== "string" || v.question.trim() === "") return false;
  if (!DOMAINS.includes(v.domain as Domain)) return false;
  if (v.choice !== "upright" && v.choice !== "reversed") return false;
  if (typeof v.nonce !== "string" || typeof v.hash !== "string") return false;
  const order = v.order;
  const picked = v.pickedIndices;
  const cardIds = v.cardIds;
  if (!Array.isArray(order) || order.length !== DECK_SIZE) return false;
  if (new Set(order).size !== DECK_SIZE || !order.every((n) => Number.isInteger(n) && n >= 0 && n < DECK_SIZE)) return false;
  if (!Array.isArray(picked) || picked.length !== 3) return false;
  if (!picked.every((n) => Number.isInteger(n) && n >= 0 && n < DECK_SIZE)) return false;
  if (!Array.isArray(cardIds) || cardIds.length !== 3) return false;
  // cardIds는 봉인 순서에서 유도된 값과 일치해야 한다 — 불일치 = 손상
  return picked.every((p, k) => order[p] === cardIds[k]);
}

export function loadLastReading(): SavedReading | null {
  try {
    const raw = localStorage.getItem(READING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastReading(reading: SavedReading): void {
  try {
    localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(reading));
  } catch {
    // 저장 실패(쿼터 등)는 의식 진행에 영향 없음 — 조용히 무시
  }
}
