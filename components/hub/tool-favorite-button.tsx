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

/**
 * 도구 페이지 우하단 floating 별표 (feedback button 위에 stack).
 * pathname이 등록된 도구 페이지가 아니면 null — Hub/admin/etc에서는 미노출.
 * Hub 카드의 별표와 동일 storage (즉시 동기 — 다음 화면 진입 시 반영).
 */
export function ToolFavoriteButton() {
  const pathname = usePathname();
  const slug = toolSlugFromPath(pathname);
  const t = useMessages();
  const user = useCurrentUser();
  const isLoggedIn = !!user;

  const [favorites, setFavorites] = useState<HubFavorites>(emptyFavorites());

  const storage = useMemo(
    () => getFavoritesStorage(isLoggedIn),
    [isLoggedIn],
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    loadFavoritesForUser(isLoggedIn).then((favs) => {
      if (!cancelled) setFavorites(favs);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, slug]);

  const handleToggle = useCallback(async () => {
    if (!slug) return;
    const next = toggleFavorite(favorites, slug);
    setFavorites(next);
    await storage.save(next);
  }, [favorites, slug, storage]);

  if (!slug) return null;
  const active = isFavorite(favorites, slug);

  return (
    <button
      type="button"
      onClick={handleToggle}
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
  );
}
