/**
 * 추천 설정 — 코드 상수 (UI 편집은 BACKLOG).
 * existingBanks: 이미 거래 중이라 신규 보너스 대상이 아닌 곳. 은행명에 name이 포함되면(대소문자 무시) 해당.
 */

export const existingBanks: { name: string; note: string }[] = [
  { name: "Bank of America", note: "기존 계좌 보유" },
  { name: "Charles Schwab", note: "기존 계좌 보유" },
  { name: "Arrowhead", note: "Arrowhead Credit Union 기존 계좌" },
];

export const SCORE = {
  holdFactor: 0.4,
  bigDdFactor: 0.7,
  bigDdThreshold: 5000,
  branchFactor: 0.7,
  hardPullFactor: 0.8,
  targetedFactor: 0.5,
  expiringDays: 30,
  newDays: 7,
  topN: 5,
} as const;
