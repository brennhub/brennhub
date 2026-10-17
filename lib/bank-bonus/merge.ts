/**
 * 병합 — 실제 오퍼 1건당 레코드 1개.
 * 키: detail_url이 있으면 "url:<정규화 URL>" (master "Read our full post" = CSV "DoC Post"),
 *     없으면 "bank:<은행 소문자>|<유형>".
 * 우선순위: bonus·DD·만료·전국/CA·카드 입금은 CSV 행 우선 (quickref가 켜져 있을 때만 존재),
 *          조회(pull)·섹션/순위·메모는 master 행. RSS(글)는 병합하지 않는다 (listStoredOffers에서 제외).
 */

import { parseDd } from "./derive";
import type { MergedOffer, StoredOffer } from "./types";

export function normalizeUrl(url: string): string {
  return url.trim().replace(/^http:/, "https:").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
}

export function offerKey(row: Pick<StoredOffer, "detail_url" | "bank" | "title" | "account_type">): string {
  if (row.detail_url) return `url:${normalizeUrl(row.detail_url)}`;
  return `bank:${(row.bank ?? row.title ?? "").toLowerCase().replace(/\s+/g, " ").trim()}|${row.account_type}`;
}

const isCsv = (r: StoredOffer) => r.source_key === "doc_quickref";
const isMaster = (r: StoredOffer) => r.source_key === "doc_master";

/** 앞쪽 행부터 첫 non-null. */
function pick<K extends keyof StoredOffer>(rows: StoredOffer[], k: K): StoredOffer[K] | null {
  for (const r of rows) if (r[k] != null) return r[k];
  return null;
}

/**
 * 신규 기준선 — 가장 먼저 본 행이 그 소스의 첫 성공 run 이후에 처음 보였을 때만.
 * 첫 run에서 한꺼번에 들어온 항목(=초기 적재)은 신규가 아니다.
 */
function afterBaseline(g: StoredOffer[]): boolean {
  const first = [...g].sort((a, b) => (a.first_seen_at < b.first_seen_at ? -1 : 1))[0];
  return !!first.source_first_ok_at && first.first_seen_at > first.source_first_ok_at;
}

export function mergeOffers(rows: StoredOffer[]): MergedOffer[] {
  const groups = new Map<string, StoredOffer[]>();
  for (const r of rows) {
    const k = offerKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }

  return [...groups.entries()].map(([key, g]) => {
    const csvFirst = [...g.filter(isCsv), ...g.filter((r) => !isCsv(r))];
    const masterFirst = [...g.filter(isMaster), ...g.filter((r) => !isMaster(r))];
    const dd = pick(masterFirst, "dd_text");
    return {
      key,
      bank: pick(masterFirst, "bank"),
      title: pick(masterFirst, "title"),
      accountType: pick(masterFirst, "account_type") ?? "unknown",
      bonusMin: pick(csvFirst, "bonus_min"),
      bonusMax: pick(csvFirst, "bonus_max"),
      bonusText: pick(csvFirst, "bonus_text"),
      bonusNote: pick(masterFirst, "bonus_note"),
      bonusBase: pick(masterFirst, "bonus_base"),
      bonusTotalWithDeposit: pick(masterFirst, "bonus_total_with_deposit"),
      bonusTotalNote: pick(masterFirst, "bonus_total_note"),
      stateText: pick(masterFirst, "state_text"),
      nationwide: pick(csvFirst, "nationwide"),
      caEligible: pick(csvFirst, "ca_eligible"),
      ddRequired: pick(csvFirst, "dd_required"),
      ddAmount: pick(csvFirst, "dd_amount"),
      ddDays: parseDd(dd).days,
      ddTiered: parseDd(dd).tiered,
      ddText: dd,
      pullText: pick(masterFirst, "pull_text"),
      hardPull: pick(masterFirst, "hard_pull"),
      ccFundingText: pick(csvFirst, "cc_funding_text"),
      expiresOn: pick(csvFirst, "expires_on"),
      depositHoldAmount: pick(masterFirst, "deposit_hold_amount"),
      depositHoldDays: pick(masterFirst, "deposit_hold_days"),
      inBranch: pick(masterFirst, "in_branch"),
      targeted: pick(masterFirst, "targeted"),
      // 한 행이라도 오퍼가 아니라고 판정되면 오퍼 아님.
      isOffer: g.every((r) => r.is_offer !== 0),
      section: pick(masterFirst, "section"),
      sectionRank: pick(masterFirst, "section_rank"),
      notes: pick(masterFirst, "notes"),
      detailUrl: pick(masterFirst, "detail_url"),
      sources: [...new Set(g.map((r) => r.source_name))],
      firstSeenAt: g.map((r) => r.first_seen_at).sort()[0],
      lastSeenAt: g.map((r) => r.last_seen_at).sort().at(-1) ?? g[0].last_seen_at,
      seenAfterBaseline: afterBaseline(g),
    };
  });
}
