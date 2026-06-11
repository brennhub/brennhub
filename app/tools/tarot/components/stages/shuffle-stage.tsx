"use client";

import { useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { RitualRng } from "@/lib/tarot/ritual";
import { TarotCard } from "../tarot-card";

/**
 * S3 셔플 — 자동 애니메이션 금지. 사용자 드래그/스와이프만이 덱을 섞는다.
 * 1회 유효 제스처 = pointerdown→up 누적 이동 ≥ 24px → Fisher-Yates 1패스.
 * 포인터 좌표·타이밍은 rng.mix()로 엔트로피에 가미된다.
 * 진행 표시 없음 — 3회 이상이면 [이제 됐어요]가 나타날 뿐, 계속 섞을 수 있다.
 */
const GESTURE_MIN_DIST = 24;

type ShuffleStageProps = {
  rng: RitualRng;
  shuffleCount: number;
  onGesture: () => void;
  onDone: () => void;
  onEditQuestion: () => void;
};

type LayerOffset = { dx: number; dy: number; rot: number };

const INITIAL_LAYERS: LayerOffset[] = [
  { dx: -6, dy: 4, rot: -4 },
  { dx: 5, dy: -3, rot: 3 },
  { dx: -2, dy: -5, rot: -1 },
];

export function ShuffleStage({
  rng,
  shuffleCount,
  onGesture,
  onDone,
  onEditQuestion,
}: ShuffleStageProps) {
  const tt = useMessages().tarot;
  const [layers, setLayers] = useState<LayerOffset[]>(INITIAL_LAYERS);
  const topRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, dist: 0, moves: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 일부 브라우저에서 capture 실패해도 드래그 추적은 계속 가능
    }
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, dist: 0, moves: 0 };
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
    if (topRef.current) topRef.current.style.transition = "none";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || !e.isPrimary) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.dist += Math.hypot(dx, dy);
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.moves++;
    if (d.moves % 3 === 0) {
      rng.mix(e.clientX | 0);
      rng.mix(e.clientY | 0);
      rng.mix((e.timeStamp * 1000) | 0);
    }
    // 탑 카드가 손을 따라오는 감쇠 이동 — 리렌더 없이 ref 직접 갱신
    if (topRef.current) {
      const fx = Math.max(-40, Math.min(40, d.dist * 0.3)) * (dx >= 0 ? 1 : -1);
      topRef.current.style.transform = `translate(${fx * 0.6}px, ${Math.max(-24, Math.min(24, dy * 0.4))}px) rotate(${fx * 0.08}deg)`;
    }
  };

  const endDrag = (counted: boolean) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (topRef.current) {
      topRef.current.style.transition = "transform 300ms ease-out";
      topRef.current.style.transform = "";
    }
    if (counted && d.dist >= GESTURE_MIN_DIST) {
      onGesture();
      // 사용자 행동에 대한 반응 — 레이어 오프셋 재배치 (자동 연출 아님)
      setLayers(
        INITIAL_LAYERS.map(() => ({
          dx: (rng.nextBelow(13) - 6) as number,
          dy: (rng.nextBelow(11) - 5) as number,
          rot: (rng.nextBelow(9) - 4) as number,
        })),
      );
    }
  };

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-10 fade-in duration-700">
      <p className="text-center text-sm text-muted-foreground">{tt.shuffleInstruction}</p>

      <div
        role="img"
        aria-label={tt.deckAria}
        className="relative h-72 w-48 cursor-grab select-none active:cursor-grabbing [-webkit-touch-callout:none]"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => endDrag(true)}
        onPointerCancel={() => endDrag(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {layers.map((l, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0"
            style={{ transform: `translate(${l.dx}px, ${l.dy}px) rotate(${l.rot}deg)` }}
          >
            <TarotCard face="back" size="lg" />
          </div>
        ))}
        <div ref={topRef} className="pointer-events-none absolute top-0 left-0">
          <TarotCard face="back" size="lg" />
        </div>
      </div>

      <div className="flex h-12 items-center">
        {shuffleCount >= 3 && (
          <button
            type="button"
            onClick={onDone}
            className="animate-in rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground fade-in duration-500"
          >
            {tt.shuffleDone}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onEditQuestion}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {tt.editQuestion}
      </button>
    </div>
  );
}
