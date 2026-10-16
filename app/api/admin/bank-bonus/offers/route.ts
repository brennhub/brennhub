/**
 * /api/admin/bank-bonus/offers — 병합 오퍼 + 점수·이유·태그·내 표시 + 요약 + Top 5.
 * query (기본값): types(checking,savings) · caOnly(1) · minBonus(300) · excludeExisting(1) ·
 *   excludeHold(0) · excludeBranch(0) · excludeHardPull(0) · includeHidden(0) · sort(score|bonus|expires).
 * 조립 로직은 lib/bank-bonus/offers.ts (순수).
 */

import { getBankBonusDb, listFlags, listStoredOffers } from "@/lib/bank-bonus/db";
import { buildOffers, parseOfferQuery } from "@/lib/bank-bonus/offers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  const query = parseOfferQuery(new URL(req.url).searchParams);
  try {
    const [rows, flags] = await Promise.all([listStoredOffers(db), listFlags(db)]);
    return Response.json({ query, ...buildOffers(rows, flags, query) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `offers query failed: ${String(e)}` }, { status: 500 });
  }
}
