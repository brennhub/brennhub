/**
 * 타로 테이블 — 카드 사전 스키마.
 * 기획 §6.1 합의 스키마 (2026-06-10). 카드 의미는 포지션(과거/현재/미래) 비의존 —
 * 사전 항목은 카드 × 방향 단위. 텍스트 필드는 { ko, en? } — en 본문은 백로그.
 */

// "other"(그 외)는 선택 전용 도메인 — 카드 키워드는 5종만 태그하고 "other"는 절대 안 쓴다.
// "other" 선택 시 리딩은 특정 매칭 없이 전체 키워드를 동등 표시(mute 없음). 칩 라벨은 i18n `tarot.domain_*`.
export const DOMAINS = ["love", "work", "money", "relation", "self", "other"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface OrientationEntry {
  /** 2~3문장 핵심 의미. 항상 노출. */
  essence: { ko: string; en?: string };
  /** 1910 원전 점술 의미 원문(영문) — "출처 있는 사전"의 실체. */
  waite: string;
  /** 방향당 4~6개. 선택 도메인 ∈ domains → 강조 + gloss 노출, 매칭 0개면 mute. */
  keywords: {
    word: { ko: string; en?: string };
    domains: Domain[];
    gloss: { ko: string; en?: string };
  }[];
}

export interface TarotCard {
  /** 0~21 (메이저 번호). */
  id: number;
  /** "strength", "death", "high-priestess" ... */
  slug: string;
  name: { ko: string; en: string };
  /** 흥미·깊이 콘텐츠 (리딩 보조). 점성·원소는 골든던 전통 — 원전 출처 아님. */
  meta: {
    numerology: number;
    element?: { ko: string };
    astrology?: { ko: string };
    /** 그림 속 상징 1줄 노트. */
    symbols: { ko: string }[];
  };
  upright: OrientationEntry;
  reversed: OrientationEntry;
}
