"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { TarotCard as TarotCardData } from "@/lib/tarot/types";
import { FlipCard } from "./flip-card";

/**
 * S7 오픈 — 과거→현재→미래 순서 강제. 사용자가 직접 탭해 뒤집는다.
 * 다음 차례 카드만 tappable (i === flippedCount).
 */
type OpenStageProps = {
  cards: readonly { card: TarotCardData; orientation: "upright" | "reversed" }[];
  flippedCount: 0 | 1 | 2 | 3;
  onFlip: () => void;
  onAllOpen: () => void;
};

export function OpenStage({ cards, flippedCount, onFlip, onAllOpen }: OpenStageProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];

  const onAllOpenRef = useRef(onAllOpen);
  useEffect(() => {
    onAllOpenRef.current = onAllOpen;
  }, [onAllOpen]);
  useEffect(() => {
    if (flippedCount !== 3) return;
    const id = setTimeout(() => onAllOpenRef.current(), 1000);
    return () => clearTimeout(id);
  }, [flippedCount]);

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-10 fade-in duration-700">
      <p className="text-center text-sm text-muted-foreground">{tt.openInstruction}</p>

      <div className="flex items-start justify-center gap-3">
        {cards.map(({ card, orientation }, i) => (
          <FlipCard
            key={card.slug}
            card={card}
            orientation={orientation}
            positionLabel={positions[i]}
            flipped={i < flippedCount}
            tappable={i === flippedCount}
            onFlip={onFlip}
          />
        ))}
      </div>
    </div>
  );
}
