/**
 * bank-bonus 화면 문구 (ko/en). 도구 이름·설명은 lib/i18n/messages.ts tools["bank-bonus"].
 * Phase 1은 공용 messages.ts 편집을 등록 항목으로 한정해 화면 문구를 여기 둔다.
 */

import { useLocale } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";

const ko = {
  adminNote: "관리자 전용 · 개발 환경 전용",
  freshness: "소스 신선도",
  lastFetch: "마지막 수집",
  httpStatus: "HTTP",
  lastModified: "Last-Modified",
  age: "Age",
  asOf: "페이지 기준",
  itemsNew: "신규",
  stale: "오래됨",
  disabled: "비활성",
  never: "없음",
  error: "오류",
  noRuns: "아직 수집 기록이 없습니다.",
  loadFailed: "불러오지 못했습니다",
  type: "유형",
  all: "전체",
  caOnly: "CA 가능만",
  minBonus: "최소 보너스",
  sortDesc: "보너스 높은 순",
  sortAsc: "보너스 낮은 순",
  loading: "불러오는 중…",
  empty: "조건에 맞는 보너스가 없습니다.",
  count: (n: number) => `${n}건`,
  col: {
    bank: "은행",
    type: "유형",
    bonus: "보너스",
    states: "지역",
    dd: "직접입금 조건",
    pull: "신용조회",
    cc: "카드 입금",
    source: "출처",
    firstSeen: "처음 확인",
    lastSeen: "마지막 확인",
    status: "상태",
  },
  types: { checking: "입출금", savings: "저축", business: "사업자", unknown: "미분류" },
  statuses: { active: "진행 중", gone: "사라짐" },
  nationwide: "전국",
  statesUnknown: "미확인",
  pinned: "고정",
};

export type BankBonusMessages = typeof ko;

const en: BankBonusMessages = {
  adminNote: "Admin only · dev only",
  freshness: "Source freshness",
  lastFetch: "Last fetch",
  httpStatus: "HTTP",
  lastModified: "Last-Modified",
  age: "Age",
  asOf: "Page as of",
  itemsNew: "New",
  stale: "Stale",
  disabled: "Disabled",
  never: "never",
  error: "Error",
  noRuns: "No fetches yet.",
  loadFailed: "Couldn't load",
  type: "Type",
  all: "All",
  caOnly: "CA eligible only",
  minBonus: "Min bonus",
  sortDesc: "Bonus: high to low",
  sortAsc: "Bonus: low to high",
  loading: "Loading…",
  empty: "No bonuses match these filters.",
  count: (n: number) => `${n} offers`,
  col: {
    bank: "Bank",
    type: "Type",
    bonus: "Bonus",
    states: "States",
    dd: "DD requirement",
    pull: "Pull",
    cc: "CC funding",
    source: "Source",
    firstSeen: "First seen",
    lastSeen: "Last seen",
    status: "Status",
  },
  types: { checking: "Checking", savings: "Savings", business: "Business", unknown: "Unknown" },
  statuses: { active: "Active", gone: "Gone" },
  nationwide: "Nationwide",
  statesUnknown: "Unknown",
  pinned: "Pinned",
};

const BANK_BONUS_MESSAGES: Record<Locale, BankBonusMessages> = { ko, en };

export function useBankBonusMessages(): BankBonusMessages {
  return BANK_BONUS_MESSAGES[useLocale().locale];
}
