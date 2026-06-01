"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { toolSlugFromPath } from "@/lib/tools/slug-from-path";
import {
  emptyFavorites,
  isFavorite,
  toggleFavorite,
  type HubFavorites,
} from "@/lib/hub/favorites";
import {
  getFavoritesStorage,
  loadFavoritesForUser,
} from "@/lib/hub/favorites-storage";
import { useLoginToast } from "@/lib/hub/login-toast";

/**
 * 도구 페이지 우하단 floating 별표 (피드백 button 위 stack).
 * 로그인 필수 — 비로그인 클릭 = 안내 toast.
 *
 * Floating stack (우하단 위→아래):
 *   bottom-32 = 좋아요
 *   bottom-20 = 즐겨찾기 (본 컴포넌트)
 *   bottom-6  = 피드백
 */
export function ToolFavoriteButton() {
  const pathname = usePathname();
  const slug = toolSlugFromPath(pathname);
  const t = useMessages();
  const user = useCurrentUser();
  const isLoggedIn = !!user;
  const { visible: toast, toggle: toggleToast, buttonRef } = useLoginToast();

  const [favorites, setFavorites] = useState<HubFavorites>(emptyFavorites());

  const storage = useMemo(
    () => getFavoritesStorage(isLoggedIn),
    [isLoggedIn],
  );

  useEffect(() => {
    if (!slug) return;
    if (!isLoggedIn) {
      setFavorites(emptyFavorites());
      return;
    }
    let cancelled = false;
    loadFavoritesForUser(isLoggedIn).then((favs) => {
      if (!cancelled) setFavorites(favs);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, slug]);

  const handleClick = useCallback(async () => {
    if (!slug) return;
    if (!isLoggedIn) {
      toggleToast();
      return;
    }
    const next = toggleFavorite(favorites, slug);
    setFavorites(next);
    await storage.save(next);
  }, [favorites, slug, storage, isLoggedIn, toggleToast]);

  if (!slug) return null;
  const active = isFavorite(favorites, slug);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={active ? t.hub.favoriteRemoveAria : t.hub.favoriteAddAria}
        className="fixed bottom-20 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-lg transition-colors hover:bg-muted"
      >
        <Star
          className={
            active
              ? "size-5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
              : "size-5 text-zinc-500 dark:text-zinc-400"
          }
        />
      </button>
      {toast && (
        <span
          role="status"
          className="fixed bottom-20 right-20 z-50 mt-2 whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.hub.favoriteLoginRequired}
        </span>
      )}
    </>
  );
}
