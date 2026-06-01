"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { toolSlugFromPath } from "@/lib/tools/slug-from-path";
import { fetchLikes, toggleLike, type LikeState } from "@/lib/hub/likes";

/**
 * 도구 페이지 우하단 floating 좋아요 (즐겨찾기 toggle 위 stack).
 * pathname이 등록된 도구 페이지가 아니면 null — Hub/admin 등에서는 미노출.
 * Hub 카드 LikeButton과 동일 storage (즉시 동기).
 * 비로그인은 클릭 시 toast 안내 (2초).
 *
 * Floating stack (우하단 위→아래):
 *   bottom-32 = 좋아요(본 컴포넌트)
 *   bottom-20 = 즐겨찾기 (ToolFavoriteButton)
 *   bottom-6  = 피드백 (FeedbackButton)
 */
export function ToolLikeButton() {
  const pathname = usePathname();
  const slug = toolSlugFromPath(pathname);
  const t = useMessages();
  const user = useCurrentUser();
  const isLoggedIn = !!user;

  const [state, setState] = useState<LikeState | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetchLikes(slug).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleClick = useCallback(async () => {
    if (!slug) return;
    if (!isLoggedIn) {
      setToast(true);
      window.setTimeout(() => setToast(false), 2000);
      return;
    }
    const next = await toggleLike(slug);
    if (next) setState(next);
  }, [slug, isLoggedIn]);

  if (!slug) return null;
  const liked = state?.liked ?? false;
  const count = state?.count ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        aria-label={liked ? t.hub.likeRemoveAria : t.hub.likeAddAria}
        className="fixed bottom-32 right-6 z-40 flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-muted"
      >
        <ThumbsUp
          className={
            liked
              ? "size-5 fill-zinc-900 text-zinc-900 dark:fill-zinc-100 dark:text-zinc-100"
              : "size-5 text-zinc-500 dark:text-zinc-400"
          }
        />
        {count > 0 && <span className="tnum">{count}</span>}
      </button>
      {toast && (
        <span
          role="status"
          className="fixed bottom-44 right-6 z-50 whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.hub.likeLoginRequired}
        </span>
      )}
    </>
  );
}
