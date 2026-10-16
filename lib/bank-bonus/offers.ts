/**
 * 오퍼 목록 조립 (순수) — 저장 행 → 병합 → 점수 → 필터 → 정렬 + 요약 + Top 5.
 * offers API가 쓰고, 로컬 검증에서도 D1 없이 돌릴 수 있다.
 */

import { SCORE } from "./config";
import { mergeOffers } from "./merge";
import { existingBankOf, scoreOffer } from "./score";
import type { AccountType, OfferFlags, ScoredOffer, StoredOffer } from "./types";

export type OfferQuery = {
  types: AccountType[];
  caOnly: boolean;
  minBonus: number | null;
  excludeExisting: boolean;
  excludeHold: boolean;
  excludeBranch: boolean;
  excludeHardPull: boolean;
  includeHidden: boolean;
  sort: "score" | "bonus" | "expires";
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
  sort: "score",
};

const ALL_TYPES: AccountType[] = ["checking", "savings", "business", "brokerage", "other", "unknown"];

/** URLSearchParams → OfferQuery. 빠진 값은 기본값, 이상한 값은 무시. */
export function parseOfferQuery(q: URLSearchParams): OfferQuery {
  const bool = (k: string, d: boolean) => (q.has(k) ? q.get(k) === "1" : d);
  const types = q.has("types")
    ? (q.get("types") ?? "").split(",").filter((t): t is AccountType => ALL_TYPES.includes(t as AccountType))
    : DEFAULT_QUERY.types;
  const min = q.get("minBonus");
  const sort = q.get("sort");
  return {
    types,
    caOnly: bool("caOnly", DEFAULT_QUERY.caOnly),
    minBonus: min === null ? DEFAULT_QUERY.minBonus : min.trim() === "" || !Number.isFinite(Number(min)) ? null : Number(min),
    excludeExisting: bool("excludeExisting", DEFAULT_QUERY.excludeExisting),
    excludeHold: bool("excludeHold", DEFAULT_QUERY.excludeHold),
    excludeBranch: bool("excludeBranch", DEFAULT_QUERY.excludeBranch),
    excludeHardPull: bool("excludeHardPull", DEFAULT_QUERY.excludeHardPull),
    includeHidden: bool("includeHidden", DEFAULT_QUERY.includeHidden),
    sort: sort === "bonus" || sort === "expires" ? sort : "score",
  };
}

export type OffersResponse = {
  offers: ScoredOffer[];
  top: ScoredOffer[];
  summary: { recommended: number; expiringSoon: number; newThisWeek: number };
  totals: { merged: number; nonOffers: number };
};

const bonusOf = (o: ScoredOffer) => o.bonusMax ?? o.bonusMin ?? -1;

export function buildOffers(
  rows: StoredOffer[],
  flags: Map<string, OfferFlags>,
  q: OfferQuery,
  now = Date.now(),
): OffersResponse {
  const merged = mergeOffers(rows);
  const scored = merged.map((o) => scoreOffer(o, flags.get(o.key), now));

  const offers = scored.filter((o) => {
    if (!o.isOffer) return false;
    if (q.types.length && !q.types.includes(o.accountType)) return false;
    if (q.caOnly && !(o.nationwide === 1 || o.caEligible === 1)) return false;
    if (q.minBonus != null && bonusOf(o) < q.minBonus) return false;
    if (q.excludeExisting && existingBankOf(o.bank)) return false;
    if (q.excludeHold && o.depositHoldAmount != null) return false;
    if (q.excludeBranch && o.inBranch === 1) return false;
    if (q.excludeHardPull && o.hardPull === 1) return false;
    if (!q.includeHidden && o.flags.hidden) return false;
    return true;
  });

  const byScore = (a: ScoredOffer, b: ScoredOffer) =>
    Number(b.eligible) - Number(a.eligible) || b.score - a.score || bonusOf(b) - bonusOf(a);
  const sorters = {
    score: byScore,
    bonus: (a: ScoredOffer, b: ScoredOffer) => bonusOf(b) - bonusOf(a) || byScore(a, b),
    // 마감일 있는 것 먼저(빠른 순), 없는 것은 점수 순.
    expires: (a: ScoredOffer, b: ScoredOffer) =>
      (a.expiresOn ?? "9999") < (b.expiresOn ?? "9999") ? -1 : (a.expiresOn ?? "9999") > (b.expiresOn ?? "9999") ? 1 : byScore(a, b),
  };
  offers.sort(sorters[q.sort]);

  // Top 5: 추천 대상 중 숨김·신청함 제외, 점수 순.
  const recommended = offers.filter((o) => o.eligible && o.score > 0 && !o.flags.hidden);
  const top = [...recommended].filter((o) => !o.flags.applied).sort(byScore).slice(0, SCORE.topN);
  const has = (o: ScoredOffer, code: string) => o.tags.some((t) => t.code === code);

  return {
    offers,
    top,
    summary: {
      recommended: recommended.length,
      expiringSoon: offers.filter((o) => has(o, "expiring")).length,
      newThisWeek: offers.filter((o) => has(o, "new")).length,
    },
    totals: { merged: merged.length, nonOffers: merged.filter((o) => !o.isOffer).length },
  };
}
