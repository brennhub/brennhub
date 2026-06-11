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
 * 스월 연출: 드래그 중 레이어 카드가 스택 중심 기준 궤도 회전 — 방향은 드래그의
 * 각도 변화 부호(시계/반시계), 진폭은 각속도 비례(손을 멈추면 그대로 멈춘다).
 * 포인터 업 시 0.5~1초 감속 후 완전 정지 — 입력 없이는 돌지 않는다(자동 루프 금지).
 * 전부 ref+transform 직접 조작(리렌더 0). prefers-reduced-motion이면 스월 없이
 * 기존 오프셋 재배치 연출만 동작한다.
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

/** 레이어별 궤도 반경(px) — 카드 폭(lg=192px) 비례 수준으로 크게. 편집장 dev 체감 후 조정 예정. */
const SWIRL_RADII = [28, 42, 56];
/** 레이어별 위상(rad) — 약 120° 간격, 세 장이 한 덩어리로 돌지 않게. */
const SWIRL_PHASES = [0, 2.1, 4.2];
/** 진폭 1.0에 도달하는 기준 각속도(rad/ms) — 대략 1초에 2/3바퀴 젓는 속도. */
const SWIRL_FULL_AMP_VELOCITY = 0.004;
/** 포인터 업 후 각속도 감쇠 시정수(ms) — 체감 정지까지 약 0.5~1초. */
const SWIRL_DECAY_TAU_MS = 180;

export function ShuffleStage({
  rng,
  shuffleCount,
  onGesture,
  onDone,
  onEditQuestion,
}: ShuffleStageProps) {
  const tt = useMessages().tarot;
  const topRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, dist: 0, moves: 0 });
  // 스월 상태 — 전부 ref, React 상태 없음 (드래그 중 리렌더 0)
  const swirlRef = useRef({
    theta: 0, // 누적 궤도 각 (rad)
    velocity: 0, // 각속도 (rad/ms) — 부호가 시계/반시계
    amp: 0, // 궤도 진폭 0~1 — 각속도 비례, 0이면 base 오프셋 그대로
    base: INITIAL_LAYERS.map((l) => ({ ...l })),
    centerX: 0,
    centerY: 0,
    lastAngle: 0,
    lastTime: 0,
    raf: 0,
    reduced: false,
  });

  useEffect(() => {
    const s = swirlRef.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  /** base 오프셋 + 궤도 변위를 합성해 레이어 transform에 직접 기록. */
  const applyLayers = () => {
    const s = swirlRef.current;
    for (let i = 0; i < 3; i++) {
      const el = layerRefs.current[i];
      if (!el) continue;
      const b = s.base[i];
      const a = s.reduced ? 0 : s.amp;
      const angle = s.theta + SWIRL_PHASES[i];
      const x = b.dx + a * SWIRL_RADII[i] * Math.cos(angle);
      const y = b.dy + a * SWIRL_RADII[i] * Math.sin(angle);
      const rot = b.rot + a * s.theta * (180 / Math.PI) * 0.15;
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    }
  };

  /** 포인터 업 후 감속 — 각속도가 0.5~1초 안에 0으로 죽고 RAF도 함께 끝난다. */
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
        // 완전 정지 — base 오프셋으로 복귀, RAF 종료 (대기 중 루프 없음)
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
    // 스월 추적 시작 — 감속 중 재드래그면 현재 θ에서 그대로 이어간다
    const s = swirlRef.current;
    cancelAnimationFrame(s.raf);
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
    // 탑 카드가 손을 따라오는 감쇠 이동 — 리렌더 없이 ref 직접 갱신
    if (topRef.current) {
      const fx = Math.max(-40, Math.min(40, d.dist * 0.3)) * (dx >= 0 ? 1 : -1);
      topRef.current.style.transform = `translate(${fx * 0.6}px, ${Math.max(-24, Math.min(24, dy * 0.4))}px) rotate(${fx * 0.08}deg)`;
    }
    // 스월 — 궤도 각은 포인터의 각도 변화만큼만 전진 (손이 멈추면 그대로 멈춘다)
    const s = swirlRef.current;
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
    if (topRef.current) {
      topRef.current.style.transition = "transform 300ms ease-out";
      topRef.current.style.transform = "";
    }
    const s = swirlRef.current;
    if (counted && d.dist >= GESTURE_MIN_DIST) {
      onGesture();
      // 사용자 행동에 대한 반응 — 레이어 base 오프셋 재배치 (자동 연출 아님)
      s.base = s.base.map(() => ({
        dx: rng.nextBelow(13) - 6,
        dy: rng.nextBelow(11) - 5,
        rot: rng.nextBelow(9) - 4,
      }));
    }
    // 입력이 끝났으므로 감속 정지 — reduced면 즉시 base 오프셋 적용
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
