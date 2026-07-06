/**
 * 환경(prod/dev) 판정 + 도구 노출 게이트 — client-safe pure 헬퍼.
 * prod = brennhub.com(top-level worker), dev = dev.brennhub.com(env.preview worker).
 * 판정 소스: wrangler vars `APP_ENV` ("prod" | "preview"). 서버 read는 lib/env.server.ts.
 * ⚠️ 이 파일은 getCloudflareContext 등 server-only import 금지 (홈 그리드=client에서 import).
 */

import type { Tool } from "@/lib/tools-registry";

/**
 * prod 여부. APP_ENV === "prod"만 true.
 * 미설정/그 외(dev preview·local) → false → devOnly 게이트는 명시적 prod에서만 작동
 * (local/dev에서는 항상 전체 노출, prod로 새지 않음).
 */
export function resolveIsProd(appEnv: string | undefined | null): boolean {
  return appEnv === "prod";
}

/** 노출 대상 도구. prod에서는 devOnly 제외, dev/local에서는 전부. (홈 그리드 등 공통) */
export function visibleTools(list: Tool[], isProd: boolean): Tool[] {
  return isProd ? list.filter((t) => !t.devOnly) : list;
}
