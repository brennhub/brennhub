"use client";

import { useCallback, useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { fetchLikes, toggleLike, type LikeState } from "@/lib/hub/likes";
import { useLoginToast } from "@/lib/hub/login-toast";

/**
 * 도구 좋아요 button.
 * - 로그인 사용자만 toggle 가능. 비로그인 클릭 = 안내 toast (재클릭/외부 클릭 dismiss).
 * - count > 0이면 숫자 표시 (0은 button만).
 * - 카드 우상단 사용 — Link 안에 들어가도 클릭 이벤트 stopPropagation.
 */
type Props = {
  slug: string;
};

export function LikeButton({ slug }: Props) {
  const t = useMessages();
  const user = useCurrentUser();
  const isLoggedIn = !!user;
  const { visible: toast, toggle: toggleToast, buttonRef } = useLoginToast();

  const [state, setState] = useState<LikeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLikes(slug).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoggedIn) {
        toggleToast();
        return;
      }
      const next = await toggleLike(slug);
      if (next) setState(next);
    },
    [slug, isLoggedIn, toggleToast],
  );

  const count = state?.count ?? 0;
  const liked = state?.liked ?? false;

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        aria-label={liked ? t.hub.likeRemoveAria : t.hub.likeAddAria}
        className="flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <ThumbsUp
          className={
            liked
              ? "size-4 fill-zinc-900 text-zinc-900 dark:fill-zinc-100 dark:text-zinc-100"
              : "size-4"
          }
        />
        {count > 0 && <span>{count}</span>}
      </button>
      {toast && (
        <span
          role="status"
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.hub.likeLoginRequired}
        </span>
      )}
    </span>
  );
}
