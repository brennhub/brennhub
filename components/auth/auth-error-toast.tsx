"use client";

/**
 * /?auth_error=<code> 토스트.
 * - fixed top-center 빨강 배너, 5초 자동 + × dismiss.
 * - dismiss 시 URL에서 auth_error param 제거 (history.replaceState).
 * - 8 server 에러 코드 → camelCase i18n 키 매핑.
 *
 * useSearchParams는 Suspense 경계 안에 있어야 하므로 layout에서 <Suspense>로 감싼다.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMessages } from "@/lib/i18n/provider";
import type { Messages } from "@/lib/i18n/messages";

type ErrorKey = keyof Messages["auth"]["errors"];

const CODE_MAP: Record<string, ErrorKey> = {
  state_mismatch: "stateMismatch",
  state_invalid: "stateInvalid",
  state_expired: "stateExpired",
  token_exchange_failed: "tokenExchangeFailed",
  id_token_invalid: "idTokenInvalid",
  id_token_unverified_email: "idTokenUnverifiedEmail",
  db_error: "dbError",
  internal: "internal",
  not_admin: "notAdmin",
};

const AUTO_DISMISS_MS = 5000;

export function AuthErrorToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useMessages().auth.errors;
  const raw = params.get("auth_error");
  // raw 변경 시 자동으로 visible 회복 — dismissed 상태가 이전 raw 값을 들고 있어 새 raw와 다르면 visible=true.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = raw !== null && raw !== dismissed;

  function stripParam() {
    const next = new URLSearchParams(params.toString());
    next.delete("auth_error");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function dismiss() {
    setDismissed(raw);
    stripParam();
  }

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      setDismissed(raw);
      stripParam();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, raw]);

  if (!raw || !visible) return null;
  const key = CODE_MAP[raw];
  const message = key ? t[key] : t.internal;
  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-50 -translate-x-1/2 max-w-md w-[calc(100%-2rem)] rounded-md bg-red-600 text-white shadow-lg px-4 py-3 flex items-start gap-3"
    >
      <span className="text-sm flex-1 leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="text-white/80 hover:text-white text-xl leading-none -mt-0.5"
      >
        ×
      </button>
    </div>
  );
}
