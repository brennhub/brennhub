/**
 * 환경 판정 — server-only (getCloudflareContext runtime var + host 읽기).
 * ⚠️ client 컴포넌트에서 import 금지 (getCloudflareContext는 server 전용 — client 번들 빌드 깨짐).
 *    client는 layout이 넘긴 값을 EnvProvider로 받는다.
 *
 * prod 판정: 1차 wrangler var APP_ENV("prod"), 2차(fail-safe) prod 도메인 host.
 * 2차는 var 유실 시에도 devOnly가 prod로 새지 않도록 하는 백스톱 — dev/local host는 절대 매칭 안 됨.
 */

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools-registry";
import { resolveIsProd } from "@/lib/env";
import { SITE_URL } from "@/lib/site";

const PROD_HOST = new URL(SITE_URL).host; // "brennhub.com"

/** 런타임 prod 여부. var 우선, 실패 시 prod 도메인 host로 폴백. 아무것도 못 읽으면 false(비-prod). */
export async function isProdEnv(): Promise<boolean> {
  // 1차: wrangler var APP_ENV (환경별 명시 — prod worker만 "prod").
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (resolveIsProd((env as unknown as { APP_ENV?: string }).APP_ENV)) return true;
  } catch {
    // var 못 읽음 → host 폴백.
  }
  // 2차(fail-safe): prod 도메인 host면 prod로 간주 (var 유실 시 devOnly leak 방지).
  try {
    const host = (await headers()).get("host")?.toLowerCase() ?? "";
    return host === PROD_HOST || host === `www.${PROD_HOST}`;
  } catch {
    return false;
  }
}

/**
 * prod에서 devOnly 도구 접근이면 404. dev/local은 통과.
 * devOnly 도구의 개별 page.tsx 상단에서 `await guardDevOnly("<slug>")`로 호출.
 */
export async function guardDevOnly(slug: string): Promise<void> {
  const tool = tools.find((t) => t.slug === slug);
  if (tool?.devOnly && (await isProdEnv())) notFound();
}
