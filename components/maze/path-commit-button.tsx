"use client";

import { Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  /** path 도구 활성 + 마크가 1개 이상일 때만 노출 — client-shell이 판정 후 전달. */
  visible: boolean;
  onCommit: () => void;
};

/**
 * "벽 생성" 버튼 (P3c-2) — 길 도구 활성 + 마크 존재 시 노출되는 contextual 액션.
 *
 * 클릭 시 client-shell이 길 마크를 grid에 반영:
 *   - 마크 셀     → EMPTY (길)
 *   - start/goal  → 보존
 *   - 그 외       → WALL
 * 1 undo entry로 history에 push되므로 즉시 실행 (모달 없음). 실수해도 Ctrl+Z로 회복.
 */
export function PathCommitButton({ visible, onCommit }: Props) {
  const t = useMessages().maze;
  if (!visible) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-lime-300/70 bg-lime-50 px-3 py-2 dark:border-lime-700/50 dark:bg-lime-950/30">
      <span className="text-xs text-lime-800 dark:text-lime-300">
        {t.commitWallsHint}
      </span>
      <button
        type="button"
        onClick={onCommit}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-md border border-lime-600 bg-lime-600 px-3 py-1 text-sm font-medium text-white transition-colors",
          "hover:bg-lime-700",
        )}
      >
        <Hammer className="size-4" aria-hidden />
        {t.commitWallsButton}
      </button>
    </div>
  );
}
