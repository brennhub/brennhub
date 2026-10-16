/**
 * /api/admin/bank-bonus/refresh — 활성 소스 전부 fetch (trigger='manual') → DoC 상세 글 → 근거 있는 AI 추출.
 * 인증: middleware.ts가 /api/admin/*를 OAuth + is_admin으로 보호.
 * GET은 브라우저 테스트용 임시 — 추후 POST + cron 호출로 바뀐다.
 * 상세 글은 최대 40건 × 300ms 간격이라 수십 초 걸릴 수 있다. AI는 그때까지 20초를 넘겼으면 이번엔 건너뛴다.
 */

import { getAiApiKey, getBankBonusDb } from "@/lib/bank-bonus/db";
import { refreshAll } from "@/lib/bank-bonus/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  try {
    const { sources, details, ai } = await refreshAll(db, "manual", getAiApiKey());
    return Response.json(
      { refreshedAt: new Date().toISOString(), results: sources, details, ai },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json({ error: `refresh failed: ${String(e)}` }, { status: 500 });
  }
}
