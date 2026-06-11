"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { TarotCard } from "../tarot-card";

/**
 * S5 배치 — 덱을 3회 탭, 위에서 한 장씩 과거/현재/미래 자리에 뒷면 배치.
 * 어느 카드가 어느 자리인지는 이미 봉인(deck[0]→과거, [1]→현재, [2]→미래) —
 * 여기서는 표시만 한다.
 */
type DealStageProps = {
  dealtCount: 0 | 1 | 2 | 3;
  onDeal: () => void;
  onDone: () => void;
};

export function DealStage({ dealtCount, onDeal, onDone }: DealStageProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (dealtCount !== 3) return;
    const id = setTimeout(() => onDoneRef.current(), 800);
    return () => clearTimeout(id);
  }, [dealtCount]);

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-10 fade-in duration-700">
      <p className="text-center text-sm text-muted-foreground">{tt.dealInstruction}</p>

      <div className="flex items-start justify-center gap-3">
        {positions.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span className="text-xs tracking-wide text-muted-foreground">{label}</span>
            {i < dealtCount ? (
              <TarotCard face="back" size="sm" className="animate-in fade-in duration-500" />
            ) : (
              <div className="aspect-[7/12] w-24 rounded-xl border-2 border-dashed border-foreground/20" />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDeal}
        disabled={dealtCount >= 3}
        aria-label={tt.deckAria}
        className="select-none disabled:opacity-40"
      >
        <TarotCard face="back" size="md" />
      </button>
    </div>
  );
}
