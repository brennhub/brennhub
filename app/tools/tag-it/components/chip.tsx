"use client";

import { Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chip } from "@/lib/tag-it/types";

type Props = {
  chip: Chip;
  onToggleSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  labels: {
    select: string;
    pin: string;
    unpin: string;
    delete: string;
  };
};

/**
 * 칩 1개 (기획서 §5.1 / §5.3).
 *   본체 클릭 = 후보 ↔ 채택 토글 / 핀 = 보호 토글 / × = 삭제.
 *   상태별 색: 후보(희미) · 채택(강조) · 보호(주황).
 * 모바일 호버 없음 → 아이콘 항상 노출 (탭으로 조작).
 */
export function ChipView({
  chip,
  onToggleSelect,
  onTogglePin,
  onDelete,
  labels,
}: Props) {
  const isProtected = chip.status === "protected";
  const isSelected = chip.status === "selected";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
        isProtected &&
          "border-orange-400 bg-orange-100 text-orange-900 dark:border-orange-500/60 dark:bg-orange-500/15 dark:text-orange-200",
        isSelected &&
          "border-primary bg-primary text-primary-foreground",
        !isProtected &&
          !isSelected &&
          "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
      )}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        aria-label={labels.select}
        aria-pressed={isSelected}
        className="cursor-pointer outline-none focus-visible:underline"
      >
        {chip.text}
        {chip.freq > 0 && (
          <span className="ml-1 text-xs opacity-60">{chip.freq}</span>
        )}
      </button>

      <button
        type="button"
        onClick={onTogglePin}
        aria-label={isProtected ? labels.unpin : labels.pin}
        aria-pressed={isProtected}
        className={cn(
          "flex size-4 items-center justify-center rounded-full outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-ring",
          isProtected ? "opacity-100" : "opacity-50 hover:opacity-100",
        )}
      >
        <Pin className={cn("size-3", isProtected && "fill-current")} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={labels.delete}
        className="flex size-4 items-center justify-center rounded-full opacity-50 outline-none transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
