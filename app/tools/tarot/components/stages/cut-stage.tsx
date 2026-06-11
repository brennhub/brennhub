"use client";

import { useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Seal } from "@/lib/tarot/ritual-state";
import { DECK_SIZE } from "@/lib/tarot/ritual-state";

/**
 * S4 컷 — 두 지점 탭으로 3더미 분할 → 합칠 순서대로 탭 (선택 순서 = 실제 덱 순열).
 * 3번째 더미 탭이 비가역 확정 트리거: 순서 고정 + 봉인 해시 표시.
 * 확정 이후 이전 단계 복귀 불가 — 수정하려면 처음부터 (리듀서가 강제).
 */
type CutStageProps = {
  piles: readonly [readonly number[], readonly number[], readonly number[]] | null;
  picked: readonly number[];
  seal: Seal | null;
  onSplit: (first: number, second: number) => void;
  onResetSplit: () => void;
  onPickPile: (pile: number) => void;
  onContinue: () => void;
};

export function CutStage({
  piles,
  picked,
  seal,
  onSplit,
  onResetSplit,
  onPickPile,
  onContinue,
}: CutStageProps) {
  const tt = useMessages().tarot;
  const [firstBoundary, setFirstBoundary] = useState<number | null>(null);

  const handleStripTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (piles !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const boundary = Math.min(DECK_SIZE - 1, Math.max(1, Math.round(ratio * DECK_SIZE)));
    if (firstBoundary === null) {
      setFirstBoundary(boundary);
    } else if (boundary !== firstBoundary) {
      const [first, second] =
        boundary < firstBoundary ? [boundary, firstBoundary] : [firstBoundary, boundary];
      setFirstBoundary(null);
      onSplit(first, second);
    }
    // 동일 경계 재탭은 무시 — 두 지점이 달라야 3더미가 성립
  };

  const handlePilePick = (pile: number) => {
    if (seal !== null || picked.includes(pile)) return;
    onPickPile(pile);
  };

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-8 fade-in duration-700">
      {piles === null ? (
        <>
          <p className="text-center text-sm text-muted-foreground">{tt.cutSplitInstruction}</p>
          <div
            role="img"
            aria-label={tt.deckAria}
            className="flex h-16 w-full max-w-sm cursor-pointer select-none gap-[2px]"
            style={{ touchAction: "manipulation" }}
            onPointerDown={handleStripTap}
          >
            {Array.from({ length: DECK_SIZE }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "min-w-0 flex-1 rounded-[2px] border border-foreground/40 bg-card",
                  firstBoundary !== null && i === firstBoundary - 1 && "border-r-4 border-r-foreground",
                )}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {seal === null && (
            <p className="text-center text-sm text-muted-foreground">{tt.cutOrderInstruction}</p>
          )}
          <div className="flex w-full max-w-sm items-stretch justify-center gap-4">
            {piles.map((pile, i) => {
              const order = picked.indexOf(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={seal !== null || order !== -1}
                  onPointerDown={() => handlePilePick(i)}
                  className={cn(
                    "relative flex-1 select-none rounded-lg border-2 border-foreground/50 bg-card px-2 py-6 text-center transition-opacity",
                    order !== -1 && "opacity-40",
                  )}
                >
                  <span className="block text-lg font-semibold">
                    {order !== -1 ? order + 1 : ""}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {tt.cutPileCount.replace("{n}", String(pile.length))}
                  </span>
                </button>
              );
            })}
          </div>
          {seal === null && picked.length === 0 && (
            <button
              type="button"
              onClick={onResetSplit}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {tt.cutRedo}
            </button>
          )}
        </>
      )}

      {seal !== null && (
        <div className="flex w-full animate-in flex-col items-center gap-4 fade-in duration-700">
          <p className="text-center font-medium">{tt.irreversibleNote}</p>
          <p className="w-full max-w-sm text-center">
            <span className="mr-2 text-[10px] tracking-wide text-muted-foreground uppercase">
              {tt.sealLabel}
            </span>
            <span className="font-mono text-[10px] break-all text-muted-foreground">
              {seal.hash}
            </span>
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground"
          >
            {tt.continueButton}
          </button>
        </div>
      )}
    </div>
  );
}
