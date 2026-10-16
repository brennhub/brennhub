/**
 * bank-bonus 화면 문구 (ko/en). 도구 이름·설명은 lib/i18n/messages.ts tools["bank-bonus"].
 * 점수 이유·태그 문구는 score.ts가 ko/en을 함께 돌려준다.
 */

import { useLocale } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";

const ko = {
  adminNote: "관리자 전용 · 개발 환경 전용",
  stale: "오래됨",
  disabled: "보관",
  never: "수집 기록 없음",
  ago: (mins: number) =>
    mins < 1 ? "방금" : mins < 60 ? `${mins}분 전` : mins < 1440 ? `${Math.floor(mins / 60)}시간 전` : `${Math.floor(mins / 1440)}일 전`,
  loadFailed: "불러오지 못했습니다",
  stats: { recommended: "추천", expiringSoon: "30일 내 마감", newThisWeek: "7일 내 신규", unit: "건" },
  top: "추천 Top 5",
  topEmpty: "지금 조건에 맞는 추천이 없습니다.",
  ddNone: "DD 불필요",
  ddUnknown: "DD 조건 미확인",
  dd: (amount: string | null, days: number | null) => `DD ${amount ?? "필요"}${days ? ` / ${days}일` : ""}`,
  expires: "마감",
  noExpiry: "마감일 미표기",
  actions: { star: "⭐ 관심", hidden: "숨김", applied: "신청함" },
  flagFailed: "저장하지 못했습니다",
  filters: {
    types: "유형",
    minBonus: "최소 보너스",
    caOnly: "CA 가능만",
    excludeExisting: "기존 거래 제외",
    excludeHold: "자금 묶임 제외",
    excludeBranch: "지점 개설 제외",
    excludeHardPull: "hard pull 제외",
    includeHidden: "숨김 포함",
    sort: "정렬",
  },
  sorts: { score: "추천 점수", bonus: "보너스", expires: "마감 임박" },
  types: { checking: "입출금", savings: "저축", business: "사업자", brokerage: "증권", other: "기타", unknown: "미분류" },
  col: {
    bank: "은행",
    bonus: "보너스",
    dd: "DD 조건",
    expires: "마감",
    pull: "조회",
    cc: "카드 입금",
    tags: "태그",
    source: "출처",
    star: "⭐",
  },
  showDetails: "원문 보기",
  hideDetails: "접기",
  score: "점수",
  whyScore: "점수 근거",
  readPost: "글 보기",
  loading: "불러오는 중…",
  empty: "조건에 맞는 보너스가 없습니다.",
  count: (n: number) => `${n}건`,
  posts: "최근 신규 글",
  postsHint: "최근 14일 · 오퍼 표와 별개",
  postsEmpty: "최근 14일 글이 없습니다.",
  pinned: "고정",
};

export type BankBonusMessages = typeof ko;

const en: BankBonusMessages = {
  adminNote: "Admin only · dev only",
  stale: "Stale",
  disabled: "Parked",
  never: "No fetches yet",
  ago: (mins: number) =>
    mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`,
  loadFailed: "Couldn't load",
  stats: { recommended: "Recommended", expiringSoon: "Ending in 30 days", newThisWeek: "New in 7 days", unit: "" },
  top: "Top 5 picks",
  topEmpty: "No picks match the current filters.",
  ddNone: "No DD needed",
  ddUnknown: "DD unknown",
  dd: (amount: string | null, days: number | null) => `DD ${amount ?? "required"}${days ? ` / ${days} days` : ""}`,
  expires: "Ends",
  noExpiry: "No end date listed",
  actions: { star: "⭐ Watch", hidden: "Hide", applied: "Applied" },
  flagFailed: "Couldn't save",
  filters: {
    types: "Type",
    minBonus: "Min bonus",
    caOnly: "CA eligible only",
    excludeExisting: "Exclude my banks",
    excludeHold: "Exclude funds locked",
    excludeBranch: "Exclude branch-only",
    excludeHardPull: "Exclude hard pull",
    includeHidden: "Include hidden",
    sort: "Sort",
  },
  sorts: { score: "Score", bonus: "Bonus", expires: "Ending soon" },
  types: { checking: "Checking", savings: "Savings", business: "Business", brokerage: "Brokerage", other: "Other", unknown: "Unknown" },
  col: {
    bank: "Bank",
    bonus: "Bonus",
    dd: "DD",
    expires: "Ends",
    pull: "Pull",
    cc: "CC funding",
    tags: "Tags",
    source: "Source",
    star: "⭐",
  },
  showDetails: "Original",
  hideDetails: "Collapse",
  score: "Score",
  whyScore: "Why this score",
  readPost: "Read post",
  loading: "Loading…",
  empty: "No bonuses match these filters.",
  count: (n: number) => `${n} offers`,
  posts: "Recent posts",
  postsHint: "Last 14 days · separate from offers",
  postsEmpty: "No posts in the last 14 days.",
  pinned: "Pinned",
};

const BANK_BONUS_MESSAGES: Record<Locale, BankBonusMessages> = { ko, en };

export function useBankBonusMessages(): BankBonusMessages {
  return BANK_BONUS_MESSAGES[useLocale().locale];
}
