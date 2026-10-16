/**
 * /api/admin/bank-bonus/offers — 병합 오퍼 + 상세 글 값 + 태그·내 표시 + 요약 + Top 5 (점수 없음).
 * query (기본값): types(checking,savings) · caOnly(1) · minBonus(300) · excludeExisting(1) ·
 *   excludeHold(0) · excludeBranch(0) · excludeHardPull(0) · includeHidden(0) · doableOnly(0) · sort(bonus|expires).
 * Top 5·요약은 표 필터와 무관하게 "지금 할 만한 오퍼" 규칙(lib/bank-bonus/rules.ts) 기준.
 */

import { getBankBonusDb, listDetails, listFlags, listStoredOffers } from "@/lib/bank-bonus/db";
import { buildOffers, parseOfferQuery } from "@/lib/bank-bonus/offers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  const query = parseOfferQuery(new URL(req.url).searchParams);
  try {
    const [rows, flags, details] = await Promise.all([listStoredOffers(db), listFlags(db), listDetails(db)]);
    return Response.json({ query, ...buildOffers(rows, flags, details, query) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `offers query failed: ${String(e)}` }, { status: 500 });
  }
}
