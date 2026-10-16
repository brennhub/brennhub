/**
 * 추천 점수 — 규칙 기반, 이유를 전부 돌려준다 (ko/en).
 * score = bonus_max (없으면 bonus_min) × 감점 계수들. 제외 조건에 걸리면 eligible=false (Top 5 대상 아님).
 */

import { SCORE, existingBanks } from "./config";
import type { Localized, MergedOffer, OfferFlags, ScoredOffer, Tag } from "./types";

const DAY = 86_400_000;
const NO_FLAGS: OfferFlags = { star: 0, hidden: 0, applied: 0, note: null };

export function existingBankOf(bank: string | null): { name: string; note: string } | null {
  if (!bank) return null;
  const b = bank.toLowerCase();
  return existingBanks.find((e) => b.includes(e.name.toLowerCase())) ?? null;
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function scoreOffer(o: MergedOffer, flags: OfferFlags | undefined, now = Date.now()): ScoredOffer {
  const reasons: Localized[] = [];
  const tags: Tag[] = [];
  let eligible = true;
  const base = o.bonusMax ?? o.bonusMin ?? 0;
  let score = base;

  reasons.push({ ko: `기본 점수 = 보너스 ${usd(base)}`, en: `Base score = bonus ${usd(base)}` });

  if (!o.isOffer) {
    eligible = false;
    reasons.push({ ko: "제외: 계좌 보너스가 아님 (묶음 글·증권·코인)", en: "Excluded: not a bank account offer (roundup, brokerage, crypto)" });
  }
  if (!(o.nationwide === 1 || o.caEligible === 1)) {
    eligible = false;
    reasons.push({ ko: "제외: 전국 대상 아님 · CA 가능 확인 안 됨", en: "Excluded: not nationwide and CA eligibility not confirmed" });
  }
  if (o.accountType !== "checking" && o.accountType !== "savings") {
    eligible = false;
    reasons.push({ ko: "제외: 입출금·저축 계좌가 아님", en: "Excluded: not a checking or savings account" });
  }
  const existing = existingBankOf(o.bank);
  if (existing) {
    eligible = false;
    reasons.push({ ko: `제외: 기존 거래 은행 (${existing.name})`, en: `Excluded: existing bank (${existing.name})` });
  }

  if (o.depositHoldAmount != null) {
    score *= SCORE.holdFactor;
    const days = o.depositHoldDays != null ? ` / ${o.depositHoldDays}일` : "";
    const daysEn = o.depositHoldDays != null ? ` for ${o.depositHoldDays} days` : "";
    reasons.push({ ko: `자금 묶임 ${usd(o.depositHoldAmount)}${days} ×${SCORE.holdFactor}`, en: `Funds locked ${usd(o.depositHoldAmount)}${daysEn} ×${SCORE.holdFactor}` });
    tags.push({ code: "hold", ko: "자금 묶임", en: "Funds locked" });
  }
  if (o.ddRequired === 1 && o.ddAmount != null && o.ddAmount > SCORE.bigDdThreshold) {
    score *= SCORE.bigDdFactor;
    reasons.push({ ko: `큰 직접입금 ${usd(o.ddAmount)} ×${SCORE.bigDdFactor}`, en: `Large direct deposit ${usd(o.ddAmount)} ×${SCORE.bigDdFactor}` });
  }
  if (o.inBranch === 1) {
    score *= SCORE.branchFactor;
    reasons.push({ ko: `지점 개설만 ×${SCORE.branchFactor}`, en: `Branch opening only ×${SCORE.branchFactor}` });
    tags.push({ code: "branch", ko: "지점만", en: "Branch only" });
  }
  if (o.hardPull === 1) {
    score *= SCORE.hardPullFactor;
    reasons.push({ ko: `hard pull ×${SCORE.hardPullFactor}`, en: `Hard pull ×${SCORE.hardPullFactor}` });
    tags.push({ code: "hardPull", ko: "hard pull", en: "Hard pull" });
  }
  if (o.targeted === 1) {
    score *= SCORE.targetedFactor;
    reasons.push({ ko: `타겟 오퍼 ×${SCORE.targetedFactor}`, en: `Targeted offer ×${SCORE.targetedFactor}` });
    tags.push({ code: "targeted", ko: "타겟", en: "Targeted" });
  }

  if (o.expiresOn) {
    const left = (Date.parse(`${o.expiresOn}T23:59:59Z`) - now) / DAY;
    if (left >= 0 && left <= SCORE.expiringDays) {
      tags.push({ code: "expiring", ko: "마감 임박", en: "Ending soon" });
      reasons.push({ ko: `${Math.ceil(left)}일 뒤 마감`, en: `Ends in ${Math.ceil(left)} days` });
    }
  }
  if (now - Date.parse(o.firstSeenAt) <= SCORE.newDays * DAY) {
    tags.push({ code: "new", ko: "신규", en: "New" });
  }

  return { ...o, score: Math.round(score), eligible, reasons, tags, flags: flags ?? NO_FLAGS };
}

/** 한 줄 요약 이유 — 감점·제외가 있으면 그것, 없으면 기본 점수. */
export function headlineReason(o: ScoredOffer): Localized {
  return o.reasons.find((r) => r.ko.startsWith("제외")) ?? o.reasons[1] ?? o.reasons[0];
}
