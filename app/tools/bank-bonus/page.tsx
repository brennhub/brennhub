import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toolMetadata } from "@/lib/seo";
import { guardDevOnly } from "@/lib/env.server";
import { getUserFromHeaders, type AuthUser } from "@/lib/auth/session";
import { getBankBonusDb, listFreshness } from "@/lib/bank-bonus/db";
import type { FreshnessRow } from "@/lib/bank-bonus/types";
import { BankBonusClientShell } from "./client-shell";

export const metadata = toolMetadata("bank-bonus");
export const dynamic = "force-dynamic";

const PATH = "/tools/bank-bonus";

/**
 * Bank Bonus Tracker — admin 전용. /tools/*는 middleware 보호 밖이라 여기서 직접 막는다
 * (dev.brennhub.com은 공개 인터넷). 리다이렉트는 middleware.ts의 /admin 처리와 동일.
 */
export default async function BankBonusPage() {
  await guardDevOnly("bank-bonus");

  const db = getBankBonusDb();
  if (!db) redirect("/?auth_error=internal");

  let user: AuthUser | null;
  try {
    user = await getUserFromHeaders(db, await headers());
  } catch {
    user = null;
    redirect("/?auth_error=internal");
  }
  if (!user) redirect(`/api/auth/google/start?return_to=${encodeURIComponent(PATH)}`);
  if (user.is_admin !== 1) redirect("/?auth_error=not_admin");

  let freshness: FreshnessRow[] | null = null;
  let loadError: string | null = null;
  try {
    freshness = await listFreshness(db);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return <BankBonusClientShell freshness={freshness} loadError={loadError} nowMs={requestTime()} />;
}

/** 상대 시간("3시간 전")은 요청 시각 기준으로 고정 — 클라이언트와 hydration 불일치 방지. */
function requestTime(): number {
  return Date.now();
}
