"use client";

import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TarotCard as TarotCardData } from "@/lib/tarot/types";
import { TarotCard } from "../tarot-card";

/**
 * S7 플립 카드 — 3D 뒤집기. 뒤집힘 = 앞면 + 이름(컴포넌트 내장) + 방향 뱃지.
 * **회전축은 사용자 선택(choice) 기준** — 정방향 선택 = 가로(rotateY, 숨은 방향 보존),
 * 역방향 선택 = 세로(rotateX, 숨은 방향 반전). 착지 방향(orientation)은 숨은 비트 × 선택의
 * 최종값(2층). 축은 "뒤집는 동작", orientation은 "착지 결과" — 둘은 별개다(2층이라 혼재 가능).
 * 순서 강제는 부모(open-stage)가 tappable로 제어한다.
 */
type FlipCardProps = {
  card: TarotCardData;
  orientation: "upright" | "reversed";
  /** 사용자 선택 — 플립 축을 정한다(정=가로/역=세로). orientation과 별개. */
  choice: "upright" | "reversed";
  positionLabel: string;
  flipped: boolean;
  tappable: boolean;
  onFlip: () => void;
};

export function FlipCard({
  card,
  orientation,
  choice,
  positionLabel,
  flipped,
  tappable,
  onFlip,
}: FlipCardProps) {
  const tt = useMessages().tarot;
  const reversed = orientation === "reversed";
  // 축은 choice 기준(뒤집는 동작): 역방향 선택 = 세로(rotateX), 정방향 = 가로(rotateY).
  // 앞면 reversed 렌더는 최종 orientation 기준. 두 면은 같은 축으로 쌓여야
  // backface-visibility가 성립한다(컨테이너 플립 + 앞면 사전회전 동일 축).
  const axis = choice === "reversed" ? "X" : "Y";

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
          style={{ transform: flipped ? `rotate${axis}(180deg)` : `rotate${axis}(0deg)` }}
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
            style={{ transform: `rotate${axis}(180deg)` }}
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
