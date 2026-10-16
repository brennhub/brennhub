/**
 * /api/admin/bank-bonus/offers — 보너스 목록.
 * query: type(checking|savings|business|unknown), caEligible=1, minBonus, status(active 기본|gone|all), sort(desc 기본|asc).
 * caEligible=1 → nationwide=1 또는 state_text에 CA. 정렬: bonus_max.
 */

import { getBankBonusDb, listOffers } from "@/lib/bank-bonus/db";

export const dynamic = "force-dynamic";

const TYPES = new Set(["checking", "savings", "business", "unknown"]);
const STATUSES = new Set(["active", "gone", "all"]);

export async function GET(req: Request) {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  const q = new URL(req.url).searchParams;
  const type = q.get("type");
  const status = q.get("status") ?? "active";
  const minBonus = q.get("minBonus") ? Number(q.get("minBonus")) : null;
  if (type && !TYPES.has(type)) return Response.json({ error: "invalid type" }, { status: 400 });
  if (!STATUSES.has(status)) return Response.json({ error: "invalid status" }, { status: 400 });
  if (minBonus != null && !Number.isFinite(minBonus)) {
    return Response.json({ error: "invalid minBonus" }, { status: 400 });
  }

  try {
    const offers = await listOffers(db, {
      type,
      caEligible: q.get("caEligible") === "1",
      minBonus,
      status,
      sort: q.get("sort") === "asc" ? "asc" : "desc",
    });
    return Response.json({ offers }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `offers query failed: ${String(e)}` }, { status: 500 });
  }
}
