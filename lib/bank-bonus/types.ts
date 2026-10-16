export type AccountType = "checking" | "savings" | "business" | "brokerage" | "other" | "unknown";

export type SourceRow = {
  id: number;
  key: string;
  name: string;
  url: string;
  kind: string;
  fetch_kind: string;
  enabled: number;
};

type Flag = 0 | 1 | null;

/** 파서 출력 1건 — bb_offers upsert 단위. 조건 필드는 선택 (없으면 NULL 저장). */
export type OfferInput = {
  externalKey: string;
  bank: string | null;
  title: string;
  accountType: AccountType;
  bonusMin: number | null;
  bonusMax: number | null;
  bonusText: string | null;
  stateText: string | null;
  nationwide: Flag;
  ddText: string | null;
  pullText: string | null;
  ccFundingText: string | null;
  detailUrl: string | null;
  pinned: 0 | 1;
  rawExcerpt: string | null;
  ddRequired?: Flag;
  ddAmount?: number | null;
  expiresOn?: string | null;
  caEligible?: Flag;
  depositHoldAmount?: number | null;
  depositHoldDays?: number | null;
  inBranch?: Flag;
  hardPull?: Flag;
  targeted?: Flag;
  isOffer?: Flag;
  section?: string | null;
  sectionRank?: number | null;
  notes?: string | null;
  publishedAt?: string | null;
  /** 기본 active. quickref CSV는 만료일 지난 행을 expired로. */
  status?: "active" | "expired";
};

export type ParseResult = {
  items: OfferInput[];
  sourceAsOf: string | null;
  /** true면 이번 run에서 사라진 항목을 gone 처리 (master만). */
  marksGone: boolean;
};

/** bb_offers 1행 (+ 소스 key/name) — merge.ts 입력. */
export type StoredOffer = {
  id: number;
  source_key: string;
  source_name: string;
  bank: string | null;
  title: string | null;
  account_type: AccountType;
  bonus_min: number | null;
  bonus_max: number | null;
  bonus_text: string | null;
  state_text: string | null;
  nationwide: number | null;
  dd_text: string | null;
  pull_text: string | null;
  cc_funding_text: string | null;
  detail_url: string | null;
  pinned: number;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  dd_required: number | null;
  dd_amount: number | null;
  expires_on: string | null;
  ca_eligible: number | null;
  deposit_hold_amount: number | null;
  deposit_hold_days: number | null;
  in_branch: number | null;
  hard_pull: number | null;
  targeted: number | null;
  is_offer: number | null;
  section: string | null;
  section_rank: number | null;
  notes: string | null;
  published_at: string | null;
};

export type OfferFlags = { star: number; hidden: number; applied: number; note: string | null };

export type Localized = { ko: string; en: string };
export type Tag = { code: "hold" | "branch" | "hardPull" | "targeted" | "expiring" | "new" } & Localized;

/** 실제 오퍼 1건 = 같은 키의 소스 행들을 합친 것. */
export type MergedOffer = {
  key: string;
  bank: string | null;
  title: string | null;
  accountType: AccountType;
  bonusMin: number | null;
  bonusMax: number | null;
  bonusText: string | null;
  stateText: string | null;
  nationwide: number | null;
  caEligible: number | null;
  ddRequired: number | null;
  ddAmount: number | null;
  ddDays: number | null;
  ddText: string | null;
  pullText: string | null;
  hardPull: number | null;
  ccFundingText: string | null;
  expiresOn: string | null;
  depositHoldAmount: number | null;
  depositHoldDays: number | null;
  inBranch: number | null;
  targeted: number | null;
  isOffer: boolean;
  section: string | null;
  sectionRank: number | null;
  notes: string | null;
  detailUrl: string | null;
  sources: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ScoredOffer = MergedOffer & {
  score: number;
  eligible: boolean;
  reasons: Localized[];
  tags: Tag[];
  flags: OfferFlags;
};

export type PostRow = {
  id: number;
  title: string | null;
  detail_url: string | null;
  pinned: number;
  published_at: string | null;
  first_seen_at: string;
  bonus_max: number | null;
  state_text: string | null;
};

export type FreshnessRow = {
  id: number;
  key: string;
  name: string;
  enabled: number;
  last_fetch_at: string | null;
  last_status: string | null;
  http_status: number | null;
  last_modified: string | null;
  age_seconds: number | null;
  source_as_of: string | null;
  items_new: number | null;
  items_found: number | null;
  error: string | null;
  last_ok_at: string | null;
  stale: boolean;
};
