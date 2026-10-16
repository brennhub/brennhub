/**
 * /api/admin/bank-bonus/flags — 내 표시 upsert (bb_offer_flags).
 * POST { offer_key, star?: 0|1, hidden?: 0|1, applied?: 0|1, note?: string|null }
 *   또는 { offer_key, flag: "star"|"hidden"|"applied", value: 0|1, note? }.
 * 넘어온 필드만 바꾼다. 응답: { offer_key, flags }.
 */

import { getBankBonusDb, upsertFlag, type FlagPatch } from "@/lib/bank-bonus/db";

export const dynamic = "force-dynamic";

const FLAGS = ["star", "hidden", "applied"] as const;
const bit = (v: unknown): 0 | 1 | null => (v === 1 || v === true ? 1 : v === 0 || v === false ? 0 : null);

export async function POST(req: Request) {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const key = body?.offer_key;
  if (typeof key !== "string" || !key.trim() || key.length > 600) {
    return Response.json({ error: "offer_key required" }, { status: 400 });
  }

  const patch: FlagPatch = {};
  for (const f of FLAGS) {
    const v = body?.flag === f ? bit(body.value) : bit(body?.[f]);
    if (v !== null) patch[f] = v;
  }
  if ("note" in (body ?? {})) {
    const note = body?.note;
    if (note !== null && typeof note !== "string") return Response.json({ error: "note must be string or null" }, { status: 400 });
    patch.note = note ? note.slice(0, 1000) : null;
  }
  if (!Object.keys(patch).length) {
    return Response.json({ error: "nothing to update (star | hidden | applied | note)" }, { status: 400 });
  }

  try {
    return Response.json({ offer_key: key, flags: await upsertFlag(db, key, patch) });
  } catch (e) {
    return Response.json({ error: `flag update failed: ${String(e)}` }, { status: 500 });
  }
}
