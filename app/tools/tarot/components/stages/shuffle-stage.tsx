"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { RitualRng } from "@/lib/tarot/ritual";
import { DECK_SIZE } from "@/lib/tarot/ritual-state";
import { TarotCard } from "../tarot-card";

/** 모션 최소화 선호 여부(런타임). true면 튀어나오는 글라이드 생략, 즉시 분리 위치 표시. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * S3 셔플 — "손으로 휘젓기" 모델 (원형 궤도). 어떤 카드도 포인터에 붙지 않는다.
 * 봉인 덱 22장 전부를 화면에 렌더(축약 금지) — 해바라기(phyllotaxis) 분포로 무대 중심에
 * 속이 찬 더미를 형성하고, 휘저으면 누적 이동이 궤도각 theta를 전진시켜 22장이 함께
 * 중심 둘레를 둥글게 돈다(무대 가로≥세로라 가로 우선 타원). 멈추면 멈추고, 다시 움직이면
 * 재개, up 해도 유지. STIR_STEP마다 z-order 순열 + onGesture()(부모 Fisher-Yates 1패스).
 * 셔플 로직·엔트로피 mix는 무변경. 연속 애니메이션(RAF) 없음 → 입력이 끝나면 멈춘다.
 * 전부 ref 직접 transform(리렌더 0). motion-reduce: 궤도는 입력 구동이라 유지.
 */
const LAYER_COUNT = DECK_SIZE; // 22 — 덱 전체
const CARD_W = 192; // lg = w-48
const CARD_H = 329; // aspect-[7/12]

// ── 휘젓기·궤도 상수 (편집장 체감 후 조정) ──
const STIR_STEP = 80; // 누적 이동(px)마다 z 순열 + onGesture 1회
const STIR_MIN_MS = 130; // 순열 최소 간격
// 시각 회전과 게이트 누적을 분리(편집장 체감): 카드는 절반 속도로 천천히 돌되,
// [이제 됐어요]·선점 활성화에 필요한 휘젓기 '거리'는 이전과 동일하게 유지.
const ORBIT_ANGLE_PER_PX = 0.003; // 시각 궤도 회전(rad/px) — 0.003 시작. 답답하면 0.004~0.005로.
const GATE_ANGLE_PER_PX = 0.012; // 게이트 누적(rad/px) — 활성화 거리 불변(시각 속도와 무관)
const REVEAL_REVOLUTIONS = 5; // [이제 됐어요] 등장 = 게이트 누적 5바퀴(≈10π). 편집장 체감 조정.
const POP_AFTER_REVOLUTIONS = 1; // 선점 가능 시점 — 최소 1바퀴 휘저은 뒤
const POP_CHANCE_DENOM = 50; // 유효 제스처당 선점 확률 1/50(~2%). 편집장 체감 조정.
const ROT_WOBBLE = 4; // 카드 기울임 진폭(±deg) — AABB 클램프에 반영
const MARGIN = 6; // 무대 가장자리 여백(px)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈2.399rad — 해바라기 위상 분산
// 카드별 위상 + 정규화 반경(0~1, sqrt로 디스크 균등 충전: 가장자리 링 아닌 속 찬 더미)
const PHASES = Array.from({ length: LAYER_COUNT }, (_, i) => i * GOLDEN_ANGLE);
const RADII = Array.from({ length: LAYER_COUNT }, (_, i) =>
  LAYER_COUNT > 1 ? Math.sqrt(i / (LAYER_COUNT - 1)) : 0,
);
// 초기 loose pile (중심 근처 작은 오프셋) — 첫 stir에서 디스크 궤도 진입
const INITIAL = Array.from({ length: LAYER_COUNT }, (_, i) => ({
  dx: ((i * 7) % 13) - 6,
  dy: ((i * 5) % 11) - 5,
  rot: ((i * 3) % 9) - 4,
}));

type ShuffleStageProps = {
  rng: RitualRng;
  markedCardId: number | null;
  onGesture: () => void;
  onMark: (cardId: number) => void;
  onDone: () => void;
  onEditQuestion: () => void;
};

export function ShuffleStage({
  rng,
  markedCardId,
  onGesture,
  onMark,
  onDone,
  onEditQuestion,
}: ShuffleStageProps) {
  const tt = useMessages().tarot;
  const areaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>(Array(LAYER_COUNT).fill(null));
  // 누적 회전 5바퀴 넘으면 [이제 됐어요] 등장 (은밀 — 진행 표시 없음)
  const [ready, setReady] = useState(false);
  // 선점 — 낮은 확률 이벤트, 세션 1회. pop 동안 휘젓기 일시정지.
  // pop: 튀어나온 카드 id·방향·비행/정착 거리(발생 시 무대 폭 실측). phase: 2단계 연출.
  // ① fling(무대 밖까지 탁 튕겨 날아감) → ② settle(화면 안 가장자리로 복귀 정착) → 질문.
  const [pop, setPop] = useState<{ id: number; dir: -1 | 1; flingX: number; settleX: number } | null>(
    null,
  );
  const [phase, setPhase] = useState<"center" | "fling" | "settle" | "return">("center");
  const [showPrompt, setShowPrompt] = useState(false);
  const popFired = useRef(false);

  // 등장 → (모션 허용) 1단계 fling → 220ms 후 2단계 settle → 420ms 후 질문.
  // motion-reduce: 곧바로 settle(정착 위치) + 즉시 질문(fling 생략).
  useEffect(() => {
    if (pop === null) return;
    const reduce = prefersReducedMotion();
    const raf = requestAnimationFrame(() => setPhase(reduce ? "settle" : "fling"));
    const timers = reduce
      ? [window.setTimeout(() => setShowPrompt(true), 0)]
      : [
          window.setTimeout(() => setPhase("settle"), 220),
          window.setTimeout(() => setShowPrompt(true), 420),
        ];
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pop]);

  // 수락/거절 — 질문 숨김 + 카드가 더미로 빠르게 역방향 복귀 후 제거. 수락은 markedCardId 기록(기존 로직).
  const dismissPop = (accept: boolean) => {
    if (pop === null) return;
    if (accept) onMark(pop.id);
    setShowPrompt(false);
    setPhase("return"); // 더미(중앙)로 복귀
    window.setTimeout(() => setPop(null), prefersReducedMotion() ? 0 : 220);
  };
  const s = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    accum: 0,
    theta: 0,
    totalRot: 0,
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

  /** theta 기준 전 22장을 해바라기 디스크 궤도 위치로 직접 배치(transition 없음). */
  const applyOrbit = () => {
    const c = s.current;
    for (let i = 0; i < LAYER_COUNT; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const a = c.theta + PHASES[i];
      const x = c.rx * RADII[i] * Math.cos(a);
      const y = c.ry * RADII[i] * Math.sin(a);
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
    if (!c.active || !e.isPrimary || pop !== null) return; // 선점 연출/프롬프트 중 휘젓기 정지
    const d = Math.hypot(e.clientX - c.lastX, e.clientY - c.lastY);
    c.lastX = e.clientX;
    c.lastY = e.clientY;
    c.accum += d;
    c.theta += d * ORBIT_ANGLE_PER_PX; // 시각 회전(감속) — 천천히 돈다
    c.totalRot += d * GATE_ANGLE_PER_PX; // 게이트 누적 — 5바퀴 활성화 거리 유지
    rng.mix(e.clientX | 0);
    rng.mix(e.clientY | 0);
    rng.mix((e.timeStamp * 1000) | 0);
    applyOrbit(); // 매 move마다 궤도 위치 갱신 (정지 시 자동 정지)
    if (!ready && c.totalRot >= REVEAL_REVOLUTIONS * 2 * Math.PI) setReady(true);
    // STIR_STEP마다 z 순열 + 실제 셔플 1패스 — 계속 저으면 계속 섞임
    if (c.accum >= STIR_STEP && e.timeStamp - c.lastReshuffleAt >= STIR_MIN_MS) {
      c.accum -= STIR_STEP;
      c.lastReshuffleAt = e.timeStamp;
      onGesture();
      reshuffleZ();
      // 선점 — 1바퀴 이상 휘젓고, 미발생·미선점일 때 낮은 확률(또는 테스트 강제)
      if (
        !popFired.current &&
        markedCardId === null &&
        c.totalRot >= POP_AFTER_REVOLUTIONS * 2 * Math.PI &&
        ((window as Window & { __tarotForcePop?: boolean }).__tarotForcePop ||
          rng.nextBelow(POP_CHANCE_DENOM) === 0)
      ) {
        popFired.current = true; // 세션 1회(수락·거절 무관)
        // 무대 폭 실측 → fling(밖까지)·settle(화면 안 가장자리, 카드 안 잘림) 거리 계산
        const areaW = areaRef.current?.getBoundingClientRect().width ?? 342;
        // 정착 위치 — 회전·스케일 포함 카드 AABB 반폭(≈96)을 빼서 화면 안에서 안 잘리게 클램프
        const settleX = Math.max(50, Math.min(areaW * 0.24, areaW / 2 - 96));
        const flingX = areaW * 0.62; // 무대 가장자리 너머(클립으로 프레임 밖 처리)
        const dir = rng.nextBelow(2) === 0 ? -1 : 1;
        setPhase("center");
        setShowPrompt(false);
        setPop({ id: rng.nextBelow(DECK_SIZE), dir, flingX, settleX }); // 후보 카드 id(0~21)
      }
    }
  };

  const endStir = () => {
    // up/cancel — theta·위치 그대로 유지(복귀·던짐 없음). 추적만 종료.
    s.current.active = false;
  };

  return (
    // 중앙 클러스터 — 안내문·무대·버튼이 화면 중앙에 적정 간격으로 모임(극단 배치 아님).
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-6 fade-in duration-700">
      <p className="shrink-0 text-center text-sm text-muted-foreground">{tt.shuffleInstruction}</p>

      {/* 무대 — 고정 높이(궤도 측정·원형 충분). 카드 22장은 중심 둘레 디스크 궤도.
          overflow-x-clip: 궤도가 화면 밖으로 나가도 가로 스크롤 미발생(Task 14에서 main→여기로 한정). */}
      <div
        ref={areaRef}
        role="img"
        aria-label={tt.deckAria}
        className="relative h-[56dvh] w-full cursor-grab touch-none overflow-x-clip select-none active:cursor-grabbing [-webkit-touch-callout:none]"
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

        {/* 선점 — 2단계: ① 더미에서 좌/우로 무대 밖까지 "탁" 튕겨 날아감(클립으로 프레임 밖) →
            ② 화면 안 가장자리로 복귀 정착(안 잘림) → 질문. 더미는 scrim dim+blur로 가라앉음. */}
        {/* stopPropagation: 무대 onPointerDown(setPointerCapture)가 버튼 클릭을 가로채지 않게. */}
        {pop !== null && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-0 z-50 transition-[background-color,backdrop-filter] duration-200 ease-out motion-reduce:transition-none",
              phase === "fling" || phase === "settle"
                ? "bg-background/75 backdrop-blur-sm"
                : "bg-background/0",
            )}
          >
            {/* 튀어나온 카드 — fling(무대 밖) → settle(화면 안 가장자리, 위로 떠) → return(더미 복귀). */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 motion-reduce:transition-none",
                phase === "fling" && "transition-transform duration-[220ms] ease-out",
                phase === "settle" && "transition-transform duration-[180ms] ease-out",
                phase === "return" && "transition-transform duration-[200ms] ease-in",
              )}
              style={{
                transform:
                  phase === "fling"
                    ? `translate(calc(-50% + ${pop.dir * pop.flingX}px), calc(-50% - 14px)) rotate(${pop.dir * 16}deg) scale(1.1)`
                    : phase === "settle"
                      ? `translate(calc(-50% + ${pop.dir * pop.settleX}px), calc(-50% - 70px)) rotate(${pop.dir * 3}deg) scale(1.04)`
                      : phase === "return"
                        ? "translate(-50%, -50%) rotate(0deg) scale(0.9)"
                        : "translate(-50%, -50%) rotate(0deg) scale(0.92)",
              }}
            >
              <TarotCard face="back" size="md" className="shadow-xl ring-2 ring-primary" />
            </div>
            {/* 점지 프롬프트 — 2단계 정착 후 하단 고정. 카드는 위로 떠 있어 세로 분리(비겹침). */}
            {showPrompt && (
              <div className="absolute inset-x-0 bottom-[7%] flex animate-in flex-col items-center gap-4 px-6 fade-in duration-300">
                <p className="text-center text-sm font-medium break-keep">{tt.popPrompt}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => dismissPop(true)}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
                  >
                    {tt.popAccept}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissPop(false)}
                    className="rounded-lg px-6 py-2.5 text-sm font-medium ring-1 ring-foreground/20"
                  >
                    {tt.popReject}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3">
        <div className="flex h-12 items-center">
          {ready && (
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
