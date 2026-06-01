"use client";

import { useCallback } from "react";
import { Star } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { useLoginToast } from "@/lib/hub/login-toast";

/**
 * Hub 카드 별표 (즐겨찾기) — 로그인 필수.
 * 비로그인 클릭 = 안내 toast (재클릭/외부 클릭 dismiss).
 * 로그인 사용자 클릭 = onToggle 호출.
 */
type Props = {
  slug: string;
  isFavorite: boolean;
  onToggle: (slug: string) => void;
};

export function CardFavoriteButton({ slug, isFavorite, onToggle }: Props) {
  const t = useMessages();
  const user = useCurrentUser();
  const isLoggedIn = !!user;
  const { visible: toast, toggle: toggleToast, buttonRef } = useLoginToast();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoggedIn) {
        toggleToast();
        return;
      }
      onToggle(slug);
    },
    [slug, isLoggedIn, onToggle, toggleToast],
  );

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? t.hub.favoriteRemoveAria : t.hub.favoriteAddAria
        }
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-amber-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
      >
        <Star
          className={
            isFavorite
              ? "size-4 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
              : "size-4"
          }
        />
      </button>
      {toast && (
        <span
          role="status"
          className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.hub.favoriteLoginRequired}
        </span>
      )}
    </span>
  );
}
