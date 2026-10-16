/**
 * 판정 설정 — 코드 상수 (UI 편집은 BACKLOG).
 * existingBanks: 이미 거래 중이라 신규 보너스 대상이 아닌 곳. 은행명에 name이 포함되면(대소문자 무시) 해당.
 * 화면의 "내 거래 은행 제외 (BoA, Schwab, Arrowhead)" 문구도 이 목록 기준 — 바꾸면 messages.ts도 같이.
 */

export const existingBanks: { name: string; note: string }[] = [
  { name: "Bank of America", note: "기존 계좌 보유" },
  { name: "Charles Schwab", note: "기존 계좌 보유" },
  { name: "Arrowhead", note: "Arrowhead Credit Union 기존 계좌" },
];

export const SCORE = {
  expiringDays: 30,
  newDays: 7,
  topN: 5,
} as const;

/** Cowork 파이프라인 — export 응답 상한. */
export const COWORK = {
  exportMaxItems: 60,
  exportTextMax: 6000,
} as const;

/** 상세 글 수집 — refresh 1회당 상한·간격·재수집 주기. */
export const DETAIL_FETCH = {
  maxPerRefresh: 40,
  gapMs: 300,
  refetchAfterDays: 7,
} as const;
