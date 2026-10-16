/**
 * /api/admin/bank-bonus/posts — 최근 14일 RSS 글 (고정 글 포함, 고정 먼저).
 */

import { getBankBonusDb, listPosts } from "@/lib/bank-bonus/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getBankBonusDb();
  if (!db) return Response.json({ error: "AUTH_DB not bound" }, { status: 500 });
  try {
    return Response.json({ posts: await listPosts(db, 14) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `posts query failed: ${String(e)}` }, { status: 500 });
  }
}
