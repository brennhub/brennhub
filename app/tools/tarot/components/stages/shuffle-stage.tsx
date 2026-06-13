"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { RitualRng } from "@/lib/tarot/ritual";
import { TarotCard } from "../tarot-card";

/**
 * S3 셔플 — 자동 애니메이션 금지. 사용자 드래그/스와이프만이 덱을 섞는다.
 * 1회 유효 제스처 = pointerdown→up 누적 이동 ≥ 24px → Fisher-Yates 1패스.
 * 포인터 좌표·타이밍은 rng.mix()로 엔트로피에 가미된다.
 * 진행 표시 없음 — 3회 이상이면 [이제 됐어요]가 나타날 뿐, 계속 섞을 수 있다.
 *
 * 연출 (0.6.0 — 자리교환): 카드 4장이 서로의 자리로 점프하며 섞인다.
 * 유효 제스처마다 scatter(넓게 흩뿌림, 상하 크게) → gather(새 슬롯 순열로 모음).
 * 카드가 겹쳐 지나가며 순서 바뀜이 보이고, 잡힌 카드는 매번 교체된다(첫 장 고정 해소).
 * 연속 애니메이션 없음(RAF 폐기) — 입력이 끝나면 그 자리에서 완전히 멈춘다.
 * 전부 ref+transform 직접 조작(리렌더 0). prefers-reduced-motion이면 scatter 생략,
 * 즉시 새 슬롯으로 점프(자리교환은 유지).
 */
const GESTURE_MIN_DIST = 24;
const LAYER_COUNT = 4;

type ShuffleStageProps = {
  rng: RitualRng;
  shuffleCount: number;
  onGesture: () => void;
  onDone: () => void;
  onEditQuestion: () => void;
};

type Pose = { dx: number; dy: number; rot: number };

/** gather 슬롯 — loose pile(쌓인 덱처럼 보이게 작은 오프셋). 자리교환은 assign 순열로 드러난다. */
const SLOTS: Pose[] = [
  { dx: -6, dy: 4, rot: -4 },
  { dx: 5, dy: -3, rot: 3 },
  { dx: -2, dy: -5, rot: -1 },
  { dx: 0, dy: 0, rot: 0 },
];

/** scatter 흩어짐 폭 (편집장 체감 후 조정). 세로 크게·가로 절제 — 390px 잘림 방지 산술 기준. */
const SCATTER_DX = 45; // ±45 — 카드(192px) 중심 195±51 → rot15° bbox가 [0,390] 안
const SCATTER_DY = 110; // ±110 — 세로는 overflow-x-clip이 안 자름(y visible)
const SCATTER_ROT = 15;
const SCATTER_MS = 260;
const GATHER_MS = 380;

export function ShuffleStage({
  rng,
  shuffleCount,
  onGesture,
  onDone,
  onEditQuestion,
}: ShuffleStageProps) {
  const tt = useMessages().tarot;
  const layerRefs = useRef<(HTMLDivElement | null)[]>(Array(LAYER_COUNT).fill(null));
  const dragRef = useRef({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, dist: 0, moves: 0 });
  const stateRef = useRef({
    assign: Array.from({ length: LAYER_COUNT }, (_, i) => i), // card → slot
    grabbed: LAYER_COUNT - 1, // 포인터 추종 카드
    timers: [] as number[],
    reduced: false,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => s.timers.forEach(clearTimeout);
  }, []);

  const slotTransform = (slot: Pose) => `translate(${slot.dx}px, ${slot.dy}px) rotate(${slot.rot}deg)`;

  /** 카드를 현재 assign 슬롯 위치로 (transition 없이 즉시). */
  const restCard = (card: number) => {
    const el = layerRefs.current[card];
    if (el) el.style.transform = slotTransform(SLOTS[stateRef.current.assign[card]]);
  };

  const clearTimers = () => {
    const s = stateRef.current;
    s.timers.forEach(clearTimeout);
    s.timers = [];
  };

  /** 유효 제스처 — scatter(흩뿌림) → gather(새 슬롯 순열로 모음). 자리교환이 시각적으로 드러난다. */
  const reshuffle = () => {
    const s = stateRef.current;
    clearTimers();

    // 새 슬롯 순열 (직전 assign과 달라지게) + z 순열 — Fisher-Yates(연출 전용 난수, rng 재사용)
    const perm = Array.from({ length: LAYER_COUNT }, (_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = rng.nextBelow(i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    if (perm.every((v, i) => v === s.assign[i])) perm.push(perm.shift() as number); // 항상 자리 바뀜 보장
    s.assign = perm;
    const z = Array.from({ length: LAYER_COUNT }, (_, i) => i);
    for (let i = z.length - 1; i > 0; i--) {
      const j = rng.nextBelow(i + 1);
      [z[i], z[j]] = [z[j], z[i]];
    }
    // 잡힌 카드 교체 — 다음 드래그는 다른 카드
    let next = rng.nextBelow(LAYER_COUNT);
    if (next === s.grabbed) next = (next + 1) % LAYER_COUNT;
    s.grabbed = next;

    if (s.reduced) {
      // 모션 감축 — scatter 없이 즉시 새 슬롯으로(자리교환은 유지)
      for (let i = 0; i < LAYER_COUNT; i++) {
        const el = layerRefs.current[i];
        if (!el) continue;
        el.style.transition = "none";
        el.style.zIndex = String(z[i]);
        restCard(i);
      }
      return;
    }

    // ⓐ scatter — 넓게 흩뿌림 (세로 크게)
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = layerRefs.current[i];
      if (!el) continue;
      el.style.transition = `transform ${SCATTER_MS}ms ease-out`;
      el.style.zIndex = String(z[i]);
      const sx = rng.nextBelow(SCATTER_DX * 2 + 1) - SCATTER_DX;
      const sy = rng.nextBelow(SCATTER_DY * 2 + 1) - SCATTER_DY;
      const sr = rng.nextBelow(SCATTER_ROT * 2 + 1) - SCATTER_ROT;
      el.style.transform = `translate(${sx}px, ${sy}px) rotate(${sr}deg)`;
    }
    // ⓑ gather — 새 슬롯으로 모음
    s.timers.push(
      window.setTimeout(() => {
        for (let i = 0; i < LAYER_COUNT; i++) {
          const el = layerRefs.current[i];
          if (!el) continue;
          el.style.transition = `transform ${GATHER_MS}ms ease-in-out`;
          restCard(i);
        }
      }, SCATTER_MS),
    );
    // transition 정리 — 이후 드래그 추종이 transition 없이 즉시 반응하도록
    s.timers.push(
      window.setTimeout(() => {
        for (const el of layerRefs.current) if (el) el.style.transition = "none";
      }, SCATTER_MS + GATHER_MS + 30),
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture 실패해도 드래그 추적 계속
    }
    clearTimers();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      dist: 0,
      moves: 0,
    };
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
    const grabbedEl = layerRefs.current[stateRef.current.grabbed];
    if (grabbedEl) {
      grabbedEl.style.transition = "none";
      grabbedEl.style.zIndex = String(LAYER_COUNT + 1); // 잡힌 카드 최상단
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || !e.isPrimary) return;
    d.dist += Math.hypot(e.clientX - d.lastX, e.clientY - d.lastY);
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.moves++;
    if (d.moves % 3 === 0) {
      rng.mix(e.clientX | 0);
      rng.mix(e.clientY | 0);
      rng.mix((e.timeStamp * 1000) | 0);
    }
    // 잡힌 카드가 손을 따라온다 — 슬롯 base + 포인터 delta (리렌더 없이 ref 직접)
    const s = stateRef.current;
    const grabbedEl = layerRefs.current[s.grabbed];
    if (grabbedEl) {
      const base = SLOTS[s.assign[s.grabbed]];
      const dx = base.dx + (e.clientX - d.startX) * 0.5;
      const dy = base.dy + (e.clientY - d.startY) * 0.5;
      const rot = base.rot + Math.max(-12, Math.min(12, (e.clientX - d.startX) * 0.05));
      grabbedEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    }
  };

  const endDrag = (counted: boolean) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    const s = stateRef.current;
    if (counted && d.dist >= GESTURE_MIN_DIST) {
      onGesture(); // 실제 셔플(Fisher-Yates 1패스)은 부모 — 연출과 분리
      reshuffle();
      return;
    }
    // 무효 제스처 — 잡힌 카드만 슬롯 복귀, 자리교환 없음
    const grabbedEl = layerRefs.current[s.grabbed];
    if (grabbedEl) {
      grabbedEl.style.transition = s.reduced ? "none" : "transform 300ms ease-out";
      restCard(s.grabbed);
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
        {SLOTS.map((slot, i) => (
          <div
            key={i}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0"
            style={{ transform: slotTransform(slot), zIndex: i }}
          >
            <TarotCard face="back" size="lg" />
          </div>
        ))}
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
