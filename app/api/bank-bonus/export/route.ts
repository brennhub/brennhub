/**
 * /api/bank-bonus/export — Cowork 예약 작업이 읽는 공개 export (세션 불필요, /api/admin 밖).
 * DoC에서 받은 공개 원문(요약·약관)과 오퍼 키만 내보낸다 — 내 표시·메모·계좌 등 소유자 정보 없음.
 * ?all=1 → 상세 글을 받은 모든 오퍼. prod에서는 404 (probe와 같은 판정).
 */

import { isProdEnv } from "@/lib/env.server";
import { getBankBonusDb, listBankRules, listDetails, listFlags, listStoredOffers } from "@/lib/bank-bonus/db";
import { buildExport } from "@/lib/bank-bonus/export";
import { evaluateAll } from "@/lib/bank-bonus/offers";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET(req: Request) {
  if (await isProdEnv()) return Response.json({ error: "Not found" }, { status: 404, headers: HEADERS });

  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500, headers: HEADERS });

  try {
    const [rows, flags, details, rules] = await Promise.all([listStoredOffers(db), listFlags(db), listDetails(db), listBankRules(db)]);
    const { all } = evaluateAll(rows, flags, details, rules);
    const includeAll = new URL(req.url).searchParams.get("all") === "1";
    return Response.json(buildExport(all, details, includeAll), { headers: HEADERS });
  } catch {
    return Response.json({ error: "export failed" }, { status: 500, headers: HEADERS });
  }
}
