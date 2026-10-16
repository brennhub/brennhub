export type AccountType = "checking" | "savings" | "business" | "unknown";

export type SourceRow = {
  id: number;
  key: string;
  name: string;
  url: string;
  kind: string;
  fetch_kind: string;
  enabled: number;
};

/** 파서 출력 1건 — bb_offers upsert 단위. */
export type OfferInput = {
  externalKey: string;
  bank: string | null;
  title: string;
  accountType: AccountType;
  bonusMin: number | null;
  bonusMax: number | null;
  bonusText: string | null;
  stateText: string | null;
  nationwide: 0 | 1 | null;
  ddText: string | null;
  pullText: string | null;
  ccFundingText: string | null;
  detailUrl: string | null;
  pinned: 0 | 1;
  rawExcerpt: string | null;
};

export type ParseResult = {
  items: OfferInput[];
  sourceAsOf: string | null;
  /** true면 이번 run에서 사라진 항목을 gone 처리 (master만). */
  marksGone: boolean;
};

export type OfferRow = {
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
  status: "active" | "gone";
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
