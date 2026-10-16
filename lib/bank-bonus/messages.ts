/**
 * bank-bonus 화면 문구 — ko/en 완전 세트. 화면의 모든 문구는 여기서만 나온다.
 * 한국어 화면에는 은행명·달러 금액 외 영어가 없고, 영어 화면에는 한국어가 없다.
 * (예외: 펼쳐 보는 "원문"·최근 글 제목은 출처 원문 그대로.)
 * 도구 이름·설명은 lib/i18n/messages.ts tools["bank-bonus"].
 */

import { useLocale } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import type { AccountType, ApplyMethod, BonusTotalNote, RuleSource } from "./types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ko = {
  adminNote: "관리자 전용 · 개발 환경 전용",
  unknown: "확인 필요",
  loading: "불러오는 중…",
  loadFailed: "불러오지 못했습니다",
  flagFailed: "저장하지 못했습니다",

  // 신선도
  sources: {
    doc_master: "닥터 오브 크레딧 월간 목록",
    doc_rss: "닥터 오브 크레딧 새 글",
    doc_quickref: "닥터 오브 크레딧 요약 시트",
    doc_churn: "닥터 오브 크레딧 재신청 목록",
  } as Record<string, string>,
  ago: (mins: number) =>
    mins < 1 ? "방금 수집" : mins < 60 ? `${mins}분 전 수집` : mins < 1440 ? `${Math.floor(mins / 60)}시간 전 수집` : `${Math.floor(mins / 1440)}일 전 수집`,
  never: "수집 기록 없음",
  asOfMonth: (year: number, month: number) => `${year}년 ${month}월판`,
  asOfChange: (date: string) => `마지막 변경 ${date}`,
  asOfFeed: (date: string) => `피드 갱신 ${date}`,
  stale: "48시간 넘게 갱신 안 됨",
  parked: "보관 중",
  fetchError: "수집 오류",

  // 숫자
  stats: { doable: "지금 할 만한 오퍼", expiringSoon: "30일 내 마감", newThisWeek: "최근 7일 새 오퍼" },
  statsUnit: (n: number) => `${n}건`,
  statsHint: "눌러서 표에서 보기",

  // 섹션
  top: "지금 할 만한 오퍼 Top 5",
  topEmpty: "지금 조건에 맞는 오퍼가 없습니다.",
  table: "전체 오퍼",
  count: (n: number) => `${n}건`,
  empty: "조건에 맞는 오퍼가 없습니다.",
  posts: "최근 7일 새 글",
  postsEmpty: "최근 7일 새 글이 없습니다.",
  pinned: "상단 고정",
  postAgo: (mins: number) => (mins < 60 ? `${Math.max(1, mins)}분 전` : mins < 1440 ? `${Math.floor(mins / 60)}시간 전` : `${Math.floor(mins / 1440)}일 전`),

  // 열 / 항목 이름
  col: {
    bank: "은행",
    bonus: "보너스",
    expires: "신청 마감",
    methods: "신청 방법",
    requirement: "보너스 조건",
    reapply: "재신청 가능",
    region: "지역",
    pull: "신용조회",
    cc: "신용카드 초기 입금",
    tags: "태그",
    source: "출처",
    star: "관심",
  },

  // 값
  bonusRange: (min: number, max: number) => (min === max ? usd(max) : `${usd(min)}–${usd(max)}`),
  bonusUpTo: (max: number) => `최대 ${usd(max)}`,
  noDeadline: "마감일 미표기",
  deadlinePassed: (date: string) => `${date} (지남, 확인 필요)`,
  methods: { online: "온라인", branch: "지점 방문", code: "오퍼 코드 필요", invite: "초대받은 사람만" } as Record<ApplyMethod, string>,
  dd: (amount: number | null, days: number | null) =>
    amount != null
      ? `직접입금 ${usd(amount)}${days ? `, ${days}일 이내` : ""}`
      : `직접입금 필요(금액 미상)${days ? `, ${days}일 이내` : ""}`,
  ddNone: "직접입금 불필요",
  reapply: (months: number) => `${months}개월 후 가능`,
  reapplyNotStated: "글에 명시 없음",
  withDeposit: (note: BonusTotalNote | null, total: number, hold: number | null, days: number | null) =>
    `${note === "top_tier" ? "최고 등급" : note === "savings" ? "저축 포함 시" : "예치 포함 시"} ${usd(total)}${
      hold != null ? ` (예치금 ${usd(hold)}${days ? `, ${days}일` : ""})` : ""
    }`,
  evidence: "근거",
  evidenceSources: { doc_post: "DoC 글", doc_churn: "DoC 처닝 목록", ai: "AI 추출", official: "공식", manual: "직접 입력" } as Record<RuleSource, string>,
  openSource: "출처 열기",
  region: { nationwide: "전국", ca: "CA 가능", notCa: "CA 불가" },
  pull: { soft: "기록 안 남음", hard: "기록 남음" },
  cc: { upTo: (n: number) => `가능 ${usd(n)}까지`, yes: "가능(한도 미상)", no: "불가" },
  tags: {
    hold: (amount: number | null, days: number | null) =>
      `${amount != null ? `예치금 ${usd(amount)} 필요` : "예치금 필요"}${days ? ` (${days}일)` : ""}`,
    branch: "지점 방문 필요",
    hardPull: "신용조회 기록 남음",
    targeted: "타겟 오퍼",
    new: "최근 7일 신규",
    expiring: "마감 임박",
  },
  appliedBadge: "신청 완료",
  hiddenBadge: "숨김",

  // 버튼
  actions: { star: "관심", hidden: "숨김", applied: "신청 완료" },
  viewPost: "오퍼 상세 보기",
  bankPage: "은행 페이지",
  expand: "원문 보기",
  collapse: "접기",
  originalTitle: "원문 제목",
  originalNotes: "원문 메모",
  originalTerms: "약관 원문",

  // 필터
  filters: {
    types: "유형",
    minBonus: "최소 보너스",
    sort: "정렬",
    doableOnly: "지금 할 만한 것만",
    caOnly: "캘리포니아 거주자 가능만",
    excludeExisting: "내 거래 은행 제외 (BoA, Schwab, Arrowhead)",
    excludeHold: "큰 예치금 필요한 곳 제외",
    excludeBranch: "지점 방문 필요한 곳 제외",
    excludeHardPull: "신용조회 기록 남는 곳 제외",
    includeHidden: "숨긴 항목도 보기",
  },
  sorts: { bonus: "보너스 큰 순", expires: "마감 빠른 순" },
  types: { checking: "입출금", savings: "저축", business: "사업자", brokerage: "증권", other: "기타", unknown: "미분류" } as Record<AccountType, string>,
};

export type BankBonusMessages = typeof ko;

const en: BankBonusMessages = {
  adminNote: "Admin only · dev only",
  unknown: "Needs checking",
  loading: "Loading…",
  loadFailed: "Couldn't load",
  flagFailed: "Couldn't save",

  sources: {
    doc_master: "Doctor of Credit monthly list",
    doc_rss: "Doctor of Credit new posts",
    doc_quickref: "Doctor of Credit quick reference sheet",
    doc_churn: "Doctor of Credit reapply list",
  },
  ago: (mins: number) =>
    mins < 1 ? "fetched just now" : mins < 60 ? `fetched ${mins}m ago` : mins < 1440 ? `fetched ${Math.floor(mins / 60)}h ago` : `fetched ${Math.floor(mins / 1440)}d ago`,
  never: "Never fetched",
  asOfMonth: (year: number, month: number) => `${MONTHS_EN[month - 1]} ${year} edition`,
  asOfChange: (date: string) => `last change ${date}`,
  asOfFeed: (date: string) => `feed updated ${date}`,
  stale: "Not updated in 48+ hours",
  parked: "Parked",
  fetchError: "Fetch error",

  stats: { doable: "Doable now", expiringSoon: "Ending in 30 days", newThisWeek: "New in 7 days" },
  statsUnit: (n: number) => String(n),
  statsHint: "Click to see in the table",

  top: "Doable now: Top 5",
  topEmpty: "Nothing matches right now.",
  table: "All offers",
  count: (n: number) => `${n} offers`,
  empty: "No offers match these filters.",
  posts: "New posts in the last 7 days",
  postsEmpty: "No new posts in the last 7 days.",
  pinned: "Pinned",
  postAgo: (mins: number) => (mins < 60 ? `${Math.max(1, mins)}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`),

  col: {
    bank: "Bank",
    bonus: "Bonus",
    expires: "Apply by",
    methods: "How to apply",
    requirement: "Bonus requirement",
    reapply: "Reapply",
    region: "Region",
    pull: "Credit check",
    cc: "Credit card funding",
    tags: "Tags",
    source: "Source",
    star: "Interested",
  },

  bonusRange: (min: number, max: number) => (min === max ? usd(max) : `${usd(min)}–${usd(max)}`),
  bonusUpTo: (max: number) => `Up to ${usd(max)}`,
  noDeadline: "Not stated",
  deadlinePassed: (date: string) => `${date} (passed, needs checking)`,
  methods: { online: "Online", branch: "Branch visit", code: "Offer code required", invite: "Invite only" },
  dd: (amount: number | null, days: number | null) =>
    amount != null
      ? `Direct deposit ${usd(amount)}${days ? ` within ${days} days` : ""}`
      : `Direct deposit required (amount not stated)${days ? ` within ${days} days` : ""}`,
  ddNone: "No direct deposit needed",
  reapply: (months: number) => `Eligible again after ${months} months`,
  reapplyNotStated: "Not stated in post",
  withDeposit: (note: BonusTotalNote | null, total: number, hold: number | null, days: number | null) =>
    `${note === "top_tier" ? "Top tier" : note === "savings" ? "With savings" : "With deposit"} ${usd(total)}${
      hold != null ? ` (deposit hold ${usd(hold)}${days ? `, ${days} days` : ""})` : ""
    }`,
  evidence: "Evidence",
  evidenceSources: { doc_post: "DoC post", doc_churn: "DoC churn list", ai: "AI extracted", official: "Official", manual: "Manual" },
  openSource: "Open source",
  region: { nationwide: "Nationwide", ca: "CA eligible", notCa: "Not in CA" },
  pull: { soft: "No record left (soft)", hard: "Record left (hard)" },
  cc: { upTo: (n: number) => `Up to ${usd(n)}`, yes: "Allowed (limit not stated)", no: "Not allowed" },
  tags: {
    hold: (amount: number | null, days: number | null) =>
      `Deposit hold${amount != null ? ` ${usd(amount)}` : ""}${days ? ` (${days} days)` : ""}`,
    branch: "Branch only",
    hardPull: "Hard credit pull",
    targeted: "Targeted",
    new: "New this week",
    expiring: "Ending soon",
  },
  appliedBadge: "Applied",
  hiddenBadge: "Hidden",

  actions: { star: "Interested", hidden: "Hide", applied: "Applied" },
  viewPost: "View offer details",
  bankPage: "Bank page",
  expand: "Show original",
  collapse: "Collapse",
  originalTitle: "Original title",
  originalNotes: "Original notes",
  originalTerms: "Original terms",

  filters: {
    types: "Type",
    minBonus: "Min bonus",
    sort: "Sort",
    doableOnly: "Doable now only",
    caOnly: "California eligible only",
    excludeExisting: "Exclude my banks (BoA, Schwab, Arrowhead)",
    excludeHold: "Exclude deposit holds",
    excludeBranch: "Exclude branch-only",
    excludeHardPull: "Exclude hard pulls",
    includeHidden: "Show hidden",
  },
  sorts: { bonus: "Bonus, high to low", expires: "Apply by, soonest" },
  types: { checking: "Checking", savings: "Savings", business: "Business", brokerage: "Brokerage", other: "Other", unknown: "Unknown" },
};

const BANK_BONUS_MESSAGES: Record<Locale, BankBonusMessages> = { ko, en };

export function useBankBonusMessages(): BankBonusMessages {
  return BANK_BONUS_MESSAGES[useLocale().locale];
}
