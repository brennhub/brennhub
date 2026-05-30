"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chip } from "@/lib/tag-it/types";

type Props = {
  chip: Chip;
  onToggleSelect: () => void;
  onDelete: () => void;
  labels: {
    select: string;
    delete: string;
    freqTitle: string; // "{n}회 등장" — hover 툴팁으로만 빈도 노출
  };
};

/**
 * 칩 1개 (기획서 §5.1 / §5.3, UI 개선 변경 1).
 *   본체 클릭 = 후보 ↔ 채택 토글 / × = 삭제. (핀/보호 UI는 MVP에서 숨김)
 *   색: 원본 문서 태그(existing)=주황 / 채택=강조 / 후보=희미.
 * 모바일 호버 없음 → × 아이콘 항상 노출 (탭으로 조작).
 */
export function ChipView({ chip, onToggleSelect, onDelete, labels }: Props) {
  const isExisting = chip.source === "existing";
  const isSelected = chip.status === "selected";

  return (
    <span
      title={
        chip.freq > 0
          ? labels.freqTitle.replace("{n}", String(chip.freq))
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
        isExisting &&
          "border-orange-400 bg-orange-100 text-orange-900 dark:border-orange-500/60 dark:bg-orange-500/15 dark:text-orange-200",
        // 채택 = 채움(solid) / 후보 = 외곽선(투명) → 색 + 형태 이중 구분(색맹 안전)
        !isExisting &&
          isSelected &&
          "border-primary bg-primary text-primary-foreground shadow-sm",
        !isExisting &&
          !isSelected &&
          "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
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
