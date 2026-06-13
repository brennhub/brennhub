"use client";

import { useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { RitualRng } from "@/lib/tarot/ritual";
import { TarotCard } from "../tarot-card";

/**
 * S3 셔플 — "손으로 휘젓기" 모델 (원형 궤도). 어떤 카드도 포인터에 붙지 않는다.
 * 휘저으면 누적 이동이 궤도각 theta를 전진시켜 카드 4장이 중심 둘레를 둥글게 돈다
 * (무대 가로≥세로라 가로 우선 타원/원). 멈추면 멈추고, 다시 움직이면 재개, up 해도 유지.
 * STIR_STEP마다 z-order 순열 + onGesture()(부모 Fisher-Yates 1패스) — 캐러셀 회전 자체가
 * 연속 자리교환이고 z 순열이 겹침 순서를 바꾼다. 셔플 로직·엔트로피 mix는 무변경.
 * 연속 애니메이션(RAF) 없음 → 입력이 끝나면 그 자리에서 멈춘다. transition 없음(움직임이 곧 연출).
 */
const LAYER_COUNT = 4;
const CARD_W = 192; // lg = w-48
const CARD_H = 329; // aspect-[7/12]

// ── 휘젓기·궤도 상수 (편집장 체감 후 조정) ──
const STIR_STEP = 80; // 누적 이동(px)마다 z 순열 + onGesture 1회
const STIR_MIN_MS = 130; // 순열 최소 간격
const ANGLE_PER_PX = 0.012; // 누적 px → 궤도각 전진(rad). 80px ≈ 0.96rad(~55°)
const ROT_WOBBLE = 4; // 카드 기울임 진폭(±deg) — AABB 클램프에 반영
const MARGIN = 6; // 무대 가장자리 여백(px)
const PHASES = Array.from({ length: LAYER_COUNT }, (_, i) => (i * 2 * Math.PI) / LAYER_COUNT);
// 초기 loose pile (중심 근처) — 첫 stir에서 궤도 진입
const INITIAL = [
  { dx: -6, dy: 6, rot: -3 },
  { dx: 6, dy: -4, rot: 3 },
  { dx: -3, dy: -7, rot: -1 },
  { dx: 2, dy: 3, rot: 2 },
];

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
  const s = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    accum: 0,
    theta: 0,
    lastReshuffleAt: 0,
    rx: 60,
    ry: 60,
  });

  /** 무대 실측 → 회전 AABB 고려한 가로 반경, 세로 반경은 가로 이하로 캡(가로≥세로 타원). */
  const measure = () => {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rad = (ROT_WOBBLE * Math.PI) / 180;
    const halfW = (CARD_W * Math.cos(rad) + CARD_H * Math.sin(rad)) / 2;
    const halfH = (CARD_H * Math.cos(rad) + CARD_W * Math.sin(rad)) / 2;
    const maxDx = Math.max(0, rect.width / 2 - halfW - MARGIN);
    const maxDy = Math.max(0, rect.height / 2 - halfH - MARGIN);
    s.current.rx = maxDx;
    s.current.ry = Math.min(maxDy, maxDx); // 세로 ≤ 가로 → 가로 우선 타원/원
  };

  /** theta 기준 전 카드를 궤도 위치로 직접 배치(transition 없음). */
  const applyOrbit = () => {
    const c = s.current;
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const a = c.theta + PHASES[i];
      const x = c.rx * Math.cos(a);
      const y = c.ry * Math.sin(a);
      const rot = ROT_WOBBLE * Math.sin(a);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    }
  };

  const reshuffleZ = () => {
    const z = Array.from({ length: LAYER_COUNT }, (_, i) => i);
    for (let i = z.length - 1; i > 0; i--) {
      const j = rng.nextBelow(i + 1);
      [z[i], z[j]] = [z[j], z[i]];
    }
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = cardRefs.current[i];
      if (el) el.style.zIndex = String(z[i]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture 실패해도 추적 계속
    }
    const c = s.current;
    c.active = true;
    c.lastX = e.clientX;
    c.lastY = e.clientY;
    c.accum = 0;
    measure();
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const c = s.current;
    if (!c.active || !e.isPrimary) return;
    const d = Math.hypot(e.clientX - c.lastX, e.clientY - c.lastY);
    c.lastX = e.clientX;
    c.lastY = e.clientY;
    c.accum += d;
    c.theta += d * ANGLE_PER_PX; // 누적 이동 → 궤도각 전진
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
    applyOrbit(); // 매 move마다 궤도 위치 갱신 (정지 시 자동 정지)
    // STIR_STEP마다 z 순열 + 실제 셔플 1패스 — 계속 저으면 계속 섞임
    if (c.accum >= STIR_STEP && e.timeStamp - c.lastReshuffleAt >= STIR_MIN_MS) {
      c.accum -= STIR_STEP;
      c.lastReshuffleAt = e.timeStamp;
      onGesture();
      reshuffleZ();
    }
  };

  const endStir = () => {
    // up/cancel — theta·위치 그대로 유지(복귀·던짐 없음). 추적만 종료.
    s.current.active = false;
  };

  return (
    <div className="flex flex-1 animate-in flex-col fade-in duration-700">
      <p className="mt-2 shrink-0 text-center text-sm text-muted-foreground">
        {tt.shuffleInstruction}
      </p>

      {/* 무대 — 가용 폭 가득·세로 충분. 카드는 중심 둘레 궤도. */}
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
            style={{ transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg)`, zIndex: i }}
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
