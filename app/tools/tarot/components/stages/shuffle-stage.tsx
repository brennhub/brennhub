"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { RitualRng } from "@/lib/tarot/ritual";
import { TarotCard } from "../tarot-card";

/**
 * S3 셔플 — "손으로 휘젓기" 모델. 어떤 카드도 포인터에 붙지 않는다(포인터 = 젓는 손 위치).
 * 휘저으면(원·지그재그·직선 무관) 누적 이동이 임계를 넘을 때마다 카드들이 자기들끼리
 * 무대 위에서 자리를 바꾼다. 멈추면 멈추고, 다시 움직이면 재개. up 해도 현 위치 유지.
 *
 * 1 reshuffle = onGesture() 1회(부모 Fisher-Yates 1패스) — 휘저은 STIR_STEP 충족 횟수가
 * shuffleCount. 셔플 로직·엔트로피 mix는 무변경, 인터랙션 모델·연출·레이아웃만.
 * 연속 애니메이션(RAF) 없음 → 입력이 끝나면 그 자리에서 완전히 멈춘다.
 * prefers-reduced-motion이면 transition 없이 즉시 재배치(휘젓기 반응은 유지).
 */
const LAYER_COUNT = 4;
const CARD_W = 192; // lg = w-48
const CARD_H = 329; // aspect-[7/12]

// ── 휘젓기·산포 상수 (편집장 체감 후 조정) ──
const STIR_STEP = 80; // 누적 이동 임계(px) — 1회 자리교환
const STIR_MIN_MS = 130; // reshuffle 최소 간격 — 전이 thrash 방지
const SCATTER_ROT = 8; // 산포 회전(±deg) — AABB 클램프에 반영
const MARGIN = 12; // 무대 가장자리 여백(px)
const TRANSITION_MS = 280;
// 초기 loose pile (중심 근처) — 휘저으면 무대로 산포
const INITIAL: Pose[] = [
  { dx: -6, dy: 6, rot: -4 },
  { dx: 6, dy: -4, rot: 3 },
  { dx: -3, dy: -7, rot: -1 },
  { dx: 2, dy: 3, rot: 2 },
];

type Pose = { dx: number; dy: number; rot: number };

type ShuffleStageProps = {
  rng: RitualRng;
  shuffleCount: number;
  onGesture: () => void;
  onDone: () => void;
  onEditQuestion: () => void;
};

export function ShuffleStage({
  rng,
  shuffleCount,
  onGesture,
  onDone,
  onEditQuestion,
}: ShuffleStageProps) {
  const tt = useMessages().tarot;
  const areaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>(Array(LAYER_COUNT).fill(null));
  const stir = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    accum: 0,
    lastReshuffleAt: 0,
    maxDx: 60,
    maxDy: 120,
    reduced: false,
  });

  useEffect(() => {
    stir.current.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const poseTransform = (p: Pose) => `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)`;

  /** 무대 실측 → 회전 AABB 고려한 산포 한계 계산 (가장자리 안 잘리는 최대). */
  const measure = () => {
    const s = stir.current;
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rad = (SCATTER_ROT * Math.PI) / 180;
    const halfW = (CARD_W * Math.cos(rad) + CARD_H * Math.sin(rad)) / 2;
    const halfH = (CARD_H * Math.cos(rad) + CARD_W * Math.sin(rad)) / 2;
    s.maxDx = Math.max(0, rect.width / 2 - halfW - MARGIN);
    s.maxDy = Math.max(0, rect.height / 2 - halfH - MARGIN);
  };

  /** 카드들을 무대 안 새 무작위 위치로 재배치(z 무작위) — 휘저을 때마다. */
  const reshuffle = () => {
    const s = stir.current;
    const z = Array.from({ length: LAYER_COUNT }, (_, i) => i);
    for (let i = z.length - 1; i > 0; i--) {
      const j = rng.nextBelow(i + 1);
      [z[i], z[j]] = [z[j], z[i]];
    }
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const dx = s.maxDx > 0 ? rng.nextBelow(s.maxDx * 2 + 1) - s.maxDx : 0;
      const dy = s.maxDy > 0 ? rng.nextBelow(s.maxDy * 2 + 1) - s.maxDy : 0;
      const rot = rng.nextBelow(SCATTER_ROT * 2 + 1) - SCATTER_ROT;
      el.style.transition = s.reduced ? "none" : `transform ${TRANSITION_MS}ms ease-out`;
      el.style.zIndex = String(z[i]);
      el.style.transform = poseTransform({ dx, dy, rot });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture 실패해도 추적 계속
    }
    const s = stir.current;
    s.active = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.accum = 0;
    measure();
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = stir.current;
    if (!s.active || !e.isPrimary) return;
    s.accum += Math.hypot(e.clientX - s.lastX, e.clientY - s.lastY);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
    // 누적 임계 + 최소 간격 충족 시 1회 자리교환 — 계속 휘저으면 계속 섞임
    if (s.accum >= STIR_STEP && e.timeStamp - s.lastReshuffleAt >= STIR_MIN_MS) {
      s.accum -= STIR_STEP;
      s.lastReshuffleAt = e.timeStamp;
      onGesture(); // 실제 셔플(shufflePass)은 부모 — 연출과 분리
      reshuffle();
    }
  };

  const endStir = () => {
    // up/cancel — 현 위치 그대로 유지(복귀·던짐 없음). 추적만 종료.
    stir.current.active = false;
  };

  return (
    <div className="flex flex-1 animate-in flex-col fade-in duration-700">
      <p className="mt-2 shrink-0 text-center text-sm text-muted-foreground">
        {tt.shuffleInstruction}
      </p>

      {/* 무대 — 가용 폭 가득·세로 충분. 카드는 중심 기준 산포. */}
      <div
        ref={areaRef}
        role="img"
        aria-label={tt.deckAria}
        className="relative w-full flex-1 cursor-grab touch-none select-none active:cursor-grabbing [-webkit-touch-callout:none]"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStir}
        onPointerCancel={endStir}
        onContextMenu={(e) => e.preventDefault()}
      >
        {INITIAL.map((p, i) => (
          <div
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -ml-24 -mt-[164px]"
            style={{ transform: poseTransform(p), zIndex: i }}
          >
            <TarotCard face="back" size="lg" />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-4 pt-2 pb-2">
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
    </div>
  );
}
