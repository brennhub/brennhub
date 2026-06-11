"use client";

import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TarotCard as TarotCardData } from "@/lib/tarot/types";
import { TarotCard } from "../tarot-card";

/**
 * S7 플립 카드 — rotateY 3D 뒤집기. 뒤집힘 = 앞면 + 이름(컴포넌트 내장) + 방향 뱃지.
 * 순서 강제는 부모(open-stage)가 tappable로 제어한다.
 */
type FlipCardProps = {
  card: TarotCardData;
  orientation: "upright" | "reversed";
  positionLabel: string;
  flipped: boolean;
  tappable: boolean;
  onFlip: () => void;
};

export function FlipCard({
  card,
  orientation,
  positionLabel,
  flipped,
  tappable,
  onFlip,
}: FlipCardProps) {
  const tt = useMessages().tarot;
  const reversed = orientation === "reversed";

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs tracking-wide text-muted-foreground">{positionLabel}</span>
      <button
        type="button"
        disabled={!tappable || flipped}
        onClick={onFlip}
        aria-label={flipped ? `${card.name.ko} ${reversed ? tt.orientationReversed : tt.orientationUpright}` : positionLabel}
        className={cn("[perspective:800px]", tappable && !flipped && "cursor-pointer")}
      >
        <div
          className="relative transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className="[backface-visibility:hidden]">
            <TarotCard
              face="back"
              size="sm"
              className={cn(tappable && !flipped && "ring-2 ring-foreground/30")}
            />
          </div>
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            <TarotCard face="front" card={card} reversed={reversed} size="sm" />
          </div>
        </div>
      </button>
      <span
        className={cn(
          "h-6 rounded-full px-3 py-1 text-xs ring-1",
          !flipped && "invisible",
          flipped && "animate-in fade-in [animation-delay:400ms] [animation-duration:500ms] [animation-fill-mode:both]",
          reversed ? "bg-foreground/10 ring-foreground/40" : "ring-foreground/20",
        )}
      >
        {reversed ? tt.orientationReversed : tt.orientationUpright}
      </span>
    </div>
  );
}
