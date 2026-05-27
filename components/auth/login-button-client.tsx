"use client";

/**
 * 로그인/로그아웃 UI.
 * - 로그아웃 상태: "로그인" anchor → /api/auth/google/start?return_to=<현재 경로>
 * - 로그인 상태  : 이름(없으면 email) + 로그아웃 form (POST, prefetch 방어)
 *
 * Next Link 미사용 — /api/auth/google/start는 302 → 외부 origin(Google)이라 plain <a>가 맞음.
 */

import { usePathname } from "next/navigation";
import { useMessages } from "@/lib/i18n/provider";
import type { AuthUser } from "@/lib/auth/session";

interface Props {
  user: AuthUser | null;
}

export function LoginButtonClient({ user }: Props) {
  const t = useMessages().auth;
  const pathname = usePathname();

  // /admin* 은 별도 basic auth 영역 — Google 로그인 노출 X.
  if (pathname?.startsWith("/admin")) return null;

  if (!user) {
    const returnTo = encodeURIComponent(pathname || "/");
    return (
      <a
        href={`/api/auth/google/start?return_to=${returnTo}`}
        className="text-sm text-zinc-700 dark:text-zinc-200 hover:underline"
      >
        {t.signIn}
      </a>
    );
  }

  const displayName = user.name || user.email;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-700 dark:text-zinc-200" title={user.email}>
        {displayName}
      </span>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
