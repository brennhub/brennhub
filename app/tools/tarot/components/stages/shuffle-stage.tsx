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
 * 연출 (0.5.0 강화 — 로직 무변경):
 * - 카드 4장이 동일 레이어 — grabbedIndex 카드만 포인터를 따라온다(잡힌 카드).
 * - 유효 제스처마다: z-order 무작위 순열 + base 오프셋·스월 위상/반경 랜덤 점프 +
 *   350ms transition으로 전 카드가 새 자리로 교차 이동("흩어졌다 모이는") +
 *   잡힌 카드가 더미로 빨려들고 다음 드래그는 다른 카드가 잡힌다.
 * - 무효 제스처(24px 미만)는 스월 감속만 — 입력 없이는 돌지 않는다(자동 루프 금지).
 * 전부 ref+transform 직접 조작(리렌더 0). prefers-reduced-motion이면 스월·transition
 * 없이 즉시 재배치만 동작한다.
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

type LayerOffset = { dx: number; dy: number; rot: number };

const INITIAL_LAYERS: LayerOffset[] = [
  { dx: -6, dy: 4, rot: -4 },
  { dx: 5, dy: -3, rot: 3 },
  { dx: -2, dy: -5, rot: -1 },
  { dx: 0, dy: 0, rot: 0 },
];

/** 레이어별 궤도 기본 반경(px) — radiusScale(0.8~1.3 랜덤)과 곱해진다. 편집장 체감 후 조정. */
const SWIRL_RADII = [48, 72, 96, 64];
/** 진폭 1.0에 도달하는 기준 각속도(rad/ms) — 대략 1초에 2/3바퀴 젓는 속도. */
const SWIRL_FULL_AMP_VELOCITY = 0.004;
/** 포인터 업 후 각속도 감쇠 시정수(ms) — 체감 정지까지 약 0.5~1초. */
const SWIRL_DECAY_TAU_MS = 180;
/** 유효 제스처 교차 이동 시간(ms). */
const RESHUFFLE_MS = 350;

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
  // 스월·연출 상태 — 전부 ref, React 상태 없음 (드래그 중 리렌더 0)
  const swirlRef = useRef({
    theta: 0,
    velocity: 0,
    amp: 0,
    base: INITIAL_LAYERS.map((l) => ({ ...l })),
    phases: [0, 2.1, 4.2, 1.0],
    radiusScale: [1, 1, 1, 1],
    grabbed: LAYER_COUNT - 1, // 현재 "잡힌" 카드 — 포인터 추종
    releasedIdx: -1, // 방금 놓인 카드 — 복귀 transition 동안 applyLayers가 건드리지 않음
    releasedAt: 0,
    centerX: 0,
    centerY: 0,
    lastAngle: 0,
    lastTime: 0,
    raf: 0,
    reshuffleTimer: 0,
    reduced: false,
  });

  useEffect(() => {
    const s = swirlRef.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      cancelAnimationFrame(s.raf);
      clearTimeout(s.reshuffleTimer);
    };
  }, []);

  const layerTransform = (i: number) => {
    const s = swirlRef.current;
    const b = s.base[i];
    const a = s.reduced ? 0 : s.amp;
    const angle = s.theta + s.phases[i];
    const r = SWIRL_RADII[i] * s.radiusScale[i];
    const x = b.dx + a * r * Math.cos(angle);
    const y = b.dy + a * r * Math.sin(angle);
    const rot = b.rot + a * s.theta * (180 / Math.PI) * 0.15;
    return `translate(${x}px, ${y}px) rotate(${rot}deg)`;
  };

  /** base + 궤도 변위를 transform에 직접 기록 — 드래그 중인 grabbed·복귀 중 카드는 제외. */
  const applyLayers = () => {
    const s = swirlRef.current;
    const d = dragRef.current;
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = layerRefs.current[i];
      if (!el) continue;
      if (d.active && i === s.grabbed) continue; // 포인터 추종 중
      if (i === s.releasedIdx && performance.now() - s.releasedAt < RESHUFFLE_MS) continue;
      el.style.transform = layerTransform(i);
    }
  };

  /** 포인터 업(무효 제스처) 후 감속 — 각속도가 0.5~1초 안에 죽고 RAF도 함께 끝난다. */
  const startSwirlDecay = () => {
    const s = swirlRef.current;
    cancelAnimationFrame(s.raf);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      s.theta += s.velocity * dt;
      s.velocity *= Math.exp(-dt / SWIRL_DECAY_TAU_MS);
      s.amp = Math.min(1, Math.abs(s.velocity) / SWIRL_FULL_AMP_VELOCITY);
      if (s.amp < 0.02) {
        s.amp = 0;
        s.velocity = 0;
        applyLayers();
        return;
      }
      applyLayers();
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };

  /** 유효 제스처 — "흩어졌다 모이는" 교차 재배치. 스월은 즉시 종료. */
  const reshuffle = () => {
    const s = swirlRef.current;
    cancelAnimationFrame(s.raf);
    clearTimeout(s.reshuffleTimer);
    s.amp = 0;
    s.velocity = 0;
    // 연출 파라미터 랜덤 점프 (연출용 난수도 rng 재사용 — base 재배치 선례)
    s.base = s.base.map(() => ({
      dx: rng.nextBelow(13) - 6,
      dy: rng.nextBelow(11) - 5,
      rot: rng.nextBelow(9) - 4,
    }));
    s.phases = s.phases.map(() => (rng.nextBelow(628) / 100) as number);
    s.radiusScale = s.radiusScale.map(() => 0.8 + rng.nextBelow(51) / 100);
    // z-order 무작위 순열 (Fisher-Yates — 연출 전용)
    const z = Array.from({ length: LAYER_COUNT }, (_, i) => i);
    for (let i = z.length - 1; i > 0; i--) {
      const j = rng.nextBelow(i + 1);
      [z[i], z[j]] = [z[j], z[i]];
    }
    // 잡힌 카드 교체 — 다음 드래그는 다른 카드
    const prevGrabbed = s.grabbed;
    let next = rng.nextBelow(LAYER_COUNT);
    if (next === prevGrabbed) next = (next + 1) % LAYER_COUNT;
    s.grabbed = next;
    s.releasedIdx = -1; // reshuffle은 전 카드를 함께 움직인다 — 복귀 예외 불필요

    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = layerRefs.current[i];
      if (!el) continue;
      el.style.transition = s.reduced ? "none" : `transform ${RESHUFFLE_MS}ms ease-out`;
      el.style.zIndex = String(z[i]);
      el.style.transform = layerTransform(i); // 잡혔던 카드도 base로 — 더미에 빨려드는 연출
    }
    s.reshuffleTimer = window.setTimeout(() => {
      for (const el of layerRefs.current) {
        if (el) el.style.transition = "none";
      }
    }, RESHUFFLE_MS + 30);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 일부 브라우저에서 capture 실패해도 드래그 추적은 계속 가능
    }
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
    const s = swirlRef.current;
    cancelAnimationFrame(s.raf);
    clearTimeout(s.reshuffleTimer);
    const grabbedEl = layerRefs.current[s.grabbed];
    if (grabbedEl) {
      grabbedEl.style.transition = "none";
      grabbedEl.style.zIndex = String(LAYER_COUNT + 1); // 잡힌 카드는 최상위
    }
    const rect = e.currentTarget.getBoundingClientRect();
    s.centerX = rect.left + rect.width / 2;
    s.centerY = rect.top + rect.height / 2;
    s.lastAngle = Math.atan2(e.clientY - s.centerY, e.clientX - s.centerX);
    s.lastTime = e.timeStamp;
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
    const s = swirlRef.current;
    // 잡힌 카드가 손을 따라오는 감쇠 이동 — 리렌더 없이 ref 직접 갱신
    const grabbedEl = layerRefs.current[s.grabbed];
    if (grabbedEl) {
      const fx = Math.max(-40, Math.min(40, d.dist * 0.3)) * (dx >= 0 ? 1 : -1);
      grabbedEl.style.transform = `translate(${fx * 0.6 + (e.clientX - d.startX) * 0.3}px, ${Math.max(-32, Math.min(32, (e.clientY - d.startY) * 0.3))}px) rotate(${fx * 0.08}deg)`;
    }
    // 스월 — 궤도 각은 포인터의 각도 변화만큼만 전진 (손이 멈추면 그대로 멈춘다)
    if (!s.reduced) {
      const angle = Math.atan2(e.clientY - s.centerY, e.clientX - s.centerX);
      let delta = angle - s.lastAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      const dt = Math.max(1, e.timeStamp - s.lastTime);
      s.lastAngle = angle;
      s.lastTime = e.timeStamp;
      s.theta += delta;
      s.velocity = 0.8 * s.velocity + 0.2 * (delta / dt);
      s.amp = Math.min(1, Math.abs(s.velocity) / SWIRL_FULL_AMP_VELOCITY);
      applyLayers();
    }
  };

  const endDrag = (counted: boolean) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    const s = swirlRef.current;
    if (counted && d.dist >= GESTURE_MIN_DIST) {
      onGesture(); // 실제 셔플(Fisher-Yates 1패스)은 부모에서 — 연출과 분리
      reshuffle();
      return;
    }
    // 무효 제스처 — 잡힌 카드는 300ms 복귀, 나머지는 스월 감속
    const grabbedEl = layerRefs.current[s.grabbed];
    if (grabbedEl && !s.reduced) {
      grabbedEl.style.transition = "transform 300ms ease-out";
      grabbedEl.style.transform = layerTransform(s.grabbed);
      s.releasedIdx = s.grabbed;
      s.releasedAt = performance.now();
    }
    if (!s.reduced && s.amp > 0) startSwirlDecay();
    else applyLayers();
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
        {INITIAL_LAYERS.map((l, i) => (
          <div
            key={i}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0"
            style={{
              transform: `translate(${l.dx}px, ${l.dy}px) rotate(${l.rot}deg)`,
              zIndex: i,
            }}
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
