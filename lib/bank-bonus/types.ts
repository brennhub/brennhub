/** 총액 조건: 저축 계좌까지 겹칠 때 / 최상위 예치 등급일 때. */
export type BonusTotalNote = "savings" | "top_tier";

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
  bonusNote?: string | null;
  bonusBase?: number | null;
  bonusTotalWithDeposit?: number | null;
  bonusTotalNote?: BonusTotalNote | null;
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
  bonus_note: string | null;
  bonus_base: number | null;
  bonus_total_with_deposit: number | null;
  bonus_total_note: BonusTotalNote | null;
  /** 소스의 첫 성공 run 종료 시각 — 신규 판정 기준선. */
  source_first_ok_at: string | null;
};

export type OfferFlags = { star: number; hidden: number; applied: number; note: string | null };

/** 실제 오퍼 1건 = 같은 키의 소스 행들을 합친 것. */
export type MergedOffer = {
  key: string;
  bank: string | null;
  title: string | null;
  accountType: AccountType;
  bonusMin: number | null;
  bonusMax: number | null;
  bonusText: string | null;
  bonusNote: string | null;
  bonusBase: number | null;
  bonusTotalWithDeposit: number | null;
  bonusTotalNote: BonusTotalNote | null;
  stateText: string | null;
  nationwide: number | null;
  caEligible: number | null;
  ddRequired: number | null;
  ddAmount: number | null;
  ddDays: number | null;
  /** 직접입금 금액이 범위·등급 — 한 숫자로 보이지 않는다 ("티어"). */
  ddTiered: boolean;
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
  /** 첫 성공 run 이후에 처음 본 항목. 7일 창은 rules.ts. */
  seenAfterBaseline: boolean;
};

export type ApplyMethod = "online" | "branch" | "code" | "invite";

/** bb_offer_details 1행 (apply_methods는 파싱된 배열). */
export type OfferDetail = {
  offer_key: string;
  detail_url: string | null;
  fetched_at: string | null;
  http_status: number | null;
  fine_print_text: string | null;
  expires_on: string | null;
  apply_methods: ApplyMethod[] | null;
  dd_amount: number | null;
  dd_days: number | null;
  dd_text: string | null;
  churn_months: number | null;
  churn_text: string | null;
  early_termination_text: string | null;
  monthly_fee_text: string | null;
  bank_offer_url: string | null;
  post_expired: number | null;
  glance_text: string | null;
  evidence: DetailEvidence;
  ai_extracted_at: string | null;
  extraction_method: string | null;
  bonus_base: number | null;
  bonus_total_with_deposit: number | null;
  bonus_total_note: BonusTotalNote | null;
  deposit_hold_amount: number | null;
  deposit_hold_days: number | null;
  deposit_hold_scope: "extra" | "base" | null;
  requirements_json: RequirementStep[] | null;
  reapply_once_only: number | null;
  eligibility_text: string | null;
  ach_push: AchPush | null;
  ach_push_text: string | null;
  fee_waiver_text: string | null;
  official_fields: OfficialFields;
  doc_posted_at: string | null;
  doc_updated_at: string | null;
};

export type AchPush = "yes" | "no" | "unclear";
export type RequirementKind = "dd" | "deposit_hold" | "open_account" | "debit_txn" | "enroll" | "other";

/** 보너스 조건 체크리스트 1단계. base = 기본 보너스 몫, extra = 겹친(추가) 보너스 몫. text는 출처 원문(200자 이하). */
export type RequirementStep = {
  order: number;
  portion: "base" | "extra";
  kind: RequirementKind;
  text: string;
  amount: number | null;
  days: number | null;
  /** 직불카드 거래 횟수 등. */
  count?: number | null;
  /** 금액이 범위·등급 — 한 숫자로 보이지 않는다. */
  tiered?: boolean;
  /** 근거 인용 + 어느 원문에서 확인됐는지. */
  quote?: string | null;
  source?: "official" | "doc_post";
  via?: "regex" | "cowork";
};

/** 공식 약관이 근거인 값 — 필드 → {값, 인용, 방식}. */
export type OfficialFields = Partial<Record<string, { value: unknown; quote: string; method: "regex" | "cowork" }>>;

/** bb_official_pages 1행. */
export type OfficialPage = {
  offer_key: string;
  url: string | null;
  fetched_at: string | null;
  http_status: number | null;
  text: string | null;
  text_hash: string | null;
  last_changed_at: string | null;
  error: string | null;
};

export type EvidenceMethod = "regex" | "cowork";
/** 필드별 근거 문장 + 뽑은 방식. 키: expires_on · dd · churn_months · dd_amount · dd_days · deposit_hold_* · apply_methods. */
export type DetailEvidence = Record<string, { quote: string; method: EvidenceMethod }>;

export type RuleSource = "manual" | "official" | "doc_post" | "doc_churn" | "cowork";

/** bb_bank_rules 1행. */
export type BankRule = {
  bank: string;
  churn_months: number | null;
  churn_text: string | null;
  source: RuleSource;
  source_url: string | null;
  evidence: string | null;
};

/** 화면 "근거" — 문장 + 출처 종류 + 링크. */
export type Evidence = {
  quote: string;
  source: RuleSource;
  url: string | null;
  /** Cowork가 뽑고 근거 대조를 통과한 값. */
  via?: "regex" | "cowork";
  /** DoC 약관이 글의 최신 Update보다 오래됨 — "DoC 기준" 표시. */
  stale?: boolean;
};

export type TagCode = "hold" | "branch" | "hardPull" | "targeted" | "membership" | "new" | "expiring";
export type OfferTag = { code: TagCode; amount?: number | null; days?: number | null };

/** 화면용 — 병합 오퍼 + 상세 글 값(우선) + 판정. 문구는 화면이 messages.ts로 만든다. */
export type EvaluatedOffer = MergedOffer & {
  /** 정렬·Top 5 기준 금액 = 기본(직접입금만) 금액, 모르면 bonus_max. */
  sortBonus: number | null;
  /** 겹친 부분 예치 (기본 보너스는 예치 없이 가능). */
  extraHoldAmount: number | null;
  extraHoldDays: number | null;
  reapply: {
    state: "value" | "once_only" | "official_not_stated" | "not_stated" | "unknown";
    months: number | null;
    evidence: Evidence | null;
  };
  evidence: { expires?: Evidence; requirement?: Evidence };
  /** 보너스 조건 체크리스트 (공식 약관 > DoC). 없으면 null → 화면은 한 줄 요약(확인 필요). */
  requirements: RequirementStep[] | null;
  requirementsEvidenceSource: RuleSource | null;
  ach: { value: AchPush | null; evidence: Evidence | null };
  eligibility: { text: string | null; restricted: boolean; evidence: Evidence | null };
  /** 공식 페이지: usable = 본문 확보, unavailable = 막힘·비200·글자 부족, none = 링크 없음·아직 안 받음. */
  official: { state: "usable" | "unavailable" | "none"; url: string | null };
  /** 상세 글을 실제로 읽었는지 (HTTP 2xx). */
  detailRead: boolean;
  expiresOn: string | null;
  applyMethods: ApplyMethod[] | null;
  churnMonths: number | null;
  churnText: string | null;
  earlyTerminationText: string | null;
  monthlyFeeText: string | null;
  bankOfferUrl: string | null;
  postExpired: boolean;
  ccFundingAllowed: 0 | 1 | null;
  ccFundingMax: number | null;
  doable: boolean;
  tags: OfferTag[];
  flags: OfferFlags;
  detailFetchedAt: string | null;
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
