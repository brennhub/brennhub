/**
 * <LoginButton /> — Server Component.
 * cookie → 세션 조회 → user를 client component에 prop으로 전달.
 *
 * AUTH_DB 미바인딩 시 로그아웃 상태로 graceful fallback.
 * D1 조회 실패는 server console 로깅 + 로그아웃 fallback.
 */

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromHeaders } from "@/lib/auth/session";
import { LoginButtonClient } from "./login-button-client";

interface AuthEnv {
  AUTH_DB?: unknown;
}

export async function LoginButton() {
  const h = await headers();
  const { env } = getCloudflareContext();
  const e = env as unknown as AuthEnv;
  if (!e.AUTH_DB) {
    return <LoginButtonClient user={null} />;
  }
  const db = e.AUTH_DB as Parameters<typeof getUserFromHeaders>[0];
  let user: Awaited<ReturnType<typeof getUserFromHeaders>> = null;
  try {
    user = await getUserFromHeaders(db, h as unknown as Headers);
  } catch (err) {
    console.error("[LoginButton] session lookup failed:", err);
  }
  return <LoginButtonClient user={user} />;
}
