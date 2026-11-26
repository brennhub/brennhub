/**
 * /api/admin/bank-bonus/runs — 최근 fetch run 50건 (소스 이름 join).
 */

import { getBankBonusDb, listRuns } from "@/lib/bank-bonus/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });
  try {
    return Response.json({ runs: await listRuns(db, 50) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `runs query failed: ${String(e)}` }, { status: 500 });
  }
}
