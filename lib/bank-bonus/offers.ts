/**
 * 오퍼 목록 조립 (순수) — 저장 행 → 병합 → 판정(rules.ts) → 필터 → 정렬 + 요약 + Top 5.
 * offers API와 refresh(상세 글 대상 선정)가 같이 쓰고, 로컬 검증에서 D1 없이도 돌린다.
 */

import { SCORE } from "./config";
import { mergeOffers } from "./merge";
import { existingBankOf, evaluateOffer } from "./rules";
import type { AccountType, BankRule, EvaluatedOffer, OfferDetail, OfferFlags, StoredOffer } from "./types";

export type OfferQuery = {
  types: AccountType[];
  caOnly: boolean;
  minBonus: number | null;
  excludeExisting: boolean;
  excludeHold: boolean;
  excludeBranch: boolean;
  excludeHardPull: boolean;
  includeHidden: boolean;
  doableOnly: boolean;
  sort: "bonus" | "expires";
};

export const DEFAULT_QUERY: OfferQuery = {
  types: ["checking", "savings"],
  caOnly: true,
  minBonus: 300,
  excludeExisting: true,
  excludeHold: false,
  excludeBranch: false,
  excludeHardPull: false,
  includeHidden: false,
  doableOnly: false,
  sort: "bonus",
};

const ALL_TYPES: AccountType[] = ["checking", "savings", "business", "brokerage", "other", "unknown"];

/** URLSearchParams → OfferQuery. 빠진 값은 기본값, 이상한 값은 무시. */
export function parseOfferQuery(q: URLSearchParams): OfferQuery {
  const bool = (k: keyof OfferQuery, d: boolean) => (q.has(k) ? q.get(k) === "1" : d);
  const types = q.has("types")
    ? (q.get("types") ?? "").split(",").filter((t): t is AccountType => ALL_TYPES.includes(t as AccountType))
    : DEFAULT_QUERY.types;
  const min = q.get("minBonus");
  return {
    types,
    caOnly: bool("caOnly", DEFAULT_QUERY.caOnly),
    minBonus: min === null ? DEFAULT_QUERY.minBonus : min.trim() === "" || !Number.isFinite(Number(min)) ? null : Number(min),
    excludeExisting: bool("excludeExisting", DEFAULT_QUERY.excludeExisting),
    excludeHold: bool("excludeHold", DEFAULT_QUERY.excludeHold),
    excludeBranch: bool("excludeBranch", DEFAULT_QUERY.excludeBranch),
    excludeHardPull: bool("excludeHardPull", DEFAULT_QUERY.excludeHardPull),
    includeHidden: bool("includeHidden", DEFAULT_QUERY.includeHidden),
    doableOnly: bool("doableOnly", DEFAULT_QUERY.doableOnly),
    sort: q.get("sort") === "expires" ? "expires" : "bonus",
  };
}

export type OffersResponse = {
  offers: EvaluatedOffer[];
  top: EvaluatedOffer[];
  /** 세 숫자 모두 "지금 할 만한 오퍼" 집합 기준 — 표 필터와 무관. */
  summary: { doable: number; expiringSoon: number; newThisWeek: number };
  totals: { merged: number; nonOffers: number };
};

const bonusOf = (o: EvaluatedOffer) => o.bonusMax ?? o.bonusMin ?? -1;
/** 기본 금액(bonus_base, 모르면 bonus_max) 큰 순, 같으면 하한 큰 순, 그다음 은행명. */
export const byBonus = (a: EvaluatedOffer, b: EvaluatedOffer) =>
  (b.sortBonus ?? -1) - (a.sortBonus ?? -1) || (b.bonusMin ?? -1) - (a.bonusMin ?? -1) || (a.bank ?? "").localeCompare(b.bank ?? "");
const byExpires = (a: EvaluatedOffer, b: EvaluatedOffer) => {
  const x = a.expiresOn ?? "9999";
  const y = b.expiresOn ?? "9999";
  return x < y ? -1 : x > y ? 1 : byBonus(a, b);
};

export function evaluateAll(
  rows: StoredOffer[],
  flags: Map<string, OfferFlags>,
  details: Map<string, OfferDetail>,
  rules: BankRule[] = [],
  now = Date.now(),
): { all: EvaluatedOffer[]; merged: number } {
  const merged = mergeOffers(rows);
  return { all: merged.map((o) => evaluateOffer(o, flags.get(o.key), details.get(o.key), rules, now)), merged: merged.length };
}

export function buildOffers(
  rows: StoredOffer[],
  flags: Map<string, OfferFlags>,
  details: Map<string, OfferDetail>,
  q: OfferQuery,
  rules: BankRule[] = [],
  now = Date.now(),
): OffersResponse {
  const { all, merged } = evaluateAll(rows, flags, details, rules, now);

  const offers = all.filter((o) => {
    if (!o.isOffer) return false;
    if (q.doableOnly && !o.doable) return false;
    if (q.types.length && !q.types.includes(o.accountType)) return false;
    if (q.caOnly && !(o.nationwide === 1 || o.caEligible === 1)) return false;
    if (q.minBonus != null && bonusOf(o) < q.minBonus) return false;
    if (q.excludeExisting && existingBankOf(o.bank)) return false;
    if (q.excludeHold && o.depositHoldAmount != null) return false;
    if (q.excludeBranch && o.tags.some((t) => t.code === "branch")) return false;
    if (q.excludeHardPull && o.hardPull === 1) return false;
    if (!q.includeHidden && o.flags.hidden) return false;
    return true;
  });
  offers.sort(q.sort === "expires" ? byExpires : byBonus);

  const doable = all.filter((o) => o.doable).sort(byBonus);
  const has = (o: EvaluatedOffer, code: string) => o.tags.some((t) => t.code === code);

  return {
    offers,
    top: doable.slice(0, SCORE.topN),
    summary: {
      doable: doable.length,
      expiringSoon: doable.filter((o) => has(o, "expiring")).length,
      newThisWeek: doable.filter((o) => has(o, "new")).length,
    },
    totals: { merged, nonOffers: all.filter((o) => !o.isOffer).length },
  };
}
