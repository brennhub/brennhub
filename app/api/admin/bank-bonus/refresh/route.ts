/**
 * /api/admin/bank-bonus/refresh — 활성 소스 전부 fetch (trigger='manual').
 * 인증: middleware.ts가 /api/admin/*를 OAuth + is_admin으로 보호.
 * GET은 브라우저 테스트용 임시 — 추후 POST + cron 호출로 바뀐다.
 */

import { getBankBonusDb, listEnabledSources } from "@/lib/bank-bonus/db";
import { fetchSource, type FetchSummary } from "@/lib/bank-bonus/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  let sources;
  try {
    sources = await listEnabledSources(db);
  } catch (e) {
    return Response.json({ error: `sources query failed: ${String(e)}` }, { status: 500 });
  }

  const results: FetchSummary[] = [];
  for (const s of sources) results.push(await fetchSource(db, s, "manual"));

  return Response.json(
    { refreshedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
