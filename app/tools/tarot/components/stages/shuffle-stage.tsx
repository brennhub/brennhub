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
// 무대를 화면 폭 가득(w-screen) 넓혀도 더미 디스크는 콤팩트·중앙 유지 — 궤도 반경 상한.
const MAX_ORBIT_R = 80; // 궤도 반경 상한(px) — 넓은 무대에서 디스크가 과하게 퍼지지 않게
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
  // popStep: 오버레이 내용 단계. anim(연출 중) → guide(징조+손가락, 카드 클릭 대기) → question(점지 질문).
  const [popStep, setPopStep] = useState<"anim" | "guide" | "question">("anim");
  const popFired = useRef(false);

  // 등장 → (모션 허용) 1단계 fling(0.85s, 천천히 옆으로 날아감) → 850ms 후 2단계 settle(0.2s 정착)
  // → 1080ms 후 guide(징조+손가락, 클릭 대기). 타이머는 fling CSS duration(850ms)과 맞물림.
  // motion-reduce: 곧바로 settle + 즉시 guide(fling 생략). 점지 질문은 카드 클릭이 게이트.
  useEffect(() => {
    if (pop === null) return;
    const reduce = prefersReducedMotion();
    const raf = requestAnimationFrame(() => setPhase(reduce ? "settle" : "fling"));
    const timers = reduce
      ? [window.setTimeout(() => setPopStep("guide"), 0)]
      : [
          window.setTimeout(() => setPhase("settle"), 850),
          window.setTimeout(() => setPopStep("guide"), 1080),
        ];
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pop]);

  // 튀어나온 카드 클릭 = 점지 질문 게이트. guide 단계에서만 동작(클릭이 질문을 연다).
  const handleCardClick = () => {
    if (popStep === "guide") setPopStep("question");
  };

  // 수락/거절 — 오버레이 숨김 + 카드가 더미로 빠르게 역방향 복귀 후 제거. 수락은 markedCardId 기록(기존 로직).
  const dismissPop = (accept: boolean) => {
    if (pop === null) return;
    if (accept) onMark(pop.id);
    setPopStep("anim");
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
    // 넓어진 무대(w-screen)에서도 디스크는 상한까지만 — 콤팩트·중앙 더미 유지.
    s.current.rx = Math.min(maxDx, MAX_ORBIT_R);
    s.current.ry = Math.min(maxDy, s.current.rx); // 세로 ≤ 가로 → 가로 우선 타원/원
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
        // 무대 폭 실측(이제 화면 폭 가득 w-screen) → settle/fling 거리 계산.
        const areaW = areaRef.current?.getBoundingClientRect().width ?? 390;
        // 정착 — 카드(md 144, 반폭 72) 100% 보임: 중심오프셋 + 72 ≤ 무대 반폭. -90 여유로 클램프.
        // 무대가 넓어 데스크톱은 멀리(≈0.26폭), 모바일은 ~100px — 충분히 옆으로 + 안 잘림.
        const settleX = Math.max(72, Math.min(areaW * 0.26, areaW / 2 - 90));
        // fling은 settle보다 살짝 더 나가는 오버슈트(천천히 날아가 지나쳤다 정착) — 단 항상 100% 보임.
        const flingX = Math.min(settleX + 60, areaW / 2 - 78);
        const dir = rng.nextBelow(2) === 0 ? -1 : 1;
        setPhase("center");
        setPopStep("anim");
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

      {/* 무대 — 화면 폭 가득(w-screen). 부모(이 컴포넌트 루트)가 flex items-center라 100vw 자식이
          뷰포트 중앙에 정렬됨 → left-1/2/-translate 불필요(추가하면 이중 이동으로 어긋남). max-w-md
          부모에 안 갇혀 카드 날아갈 공간 확보. 디스크는 MAX_ORBIT_R로 콤팩트·중앙 유지.
          overflow-x-clip: 무대 밖(=화면 밖)으로 나가도 가로 스크롤 미발생. */}
      <div
        ref={areaRef}
        role="img"
        aria-label={tt.deckAria}
        className="relative h-[56dvh] w-screen cursor-grab touch-none overflow-x-clip select-none active:cursor-grabbing [-webkit-touch-callout:none]"
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

        {/* 선점 — 넓어진 무대에서 카드가 천천히 옆으로 날아가 정착(100% 보임) → 질문.
            더미는 가리지 않음(약한 dim만, blur 없음) — 셔플하던 맥락 유지, 한 장만 강조. */}
        {/* stopPropagation: 무대 onPointerDown(setPointerCapture)가 버튼 클릭을 가로채지 않게. */}
        {pop !== null && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-0 z-50 transition-colors duration-300 ease-out motion-reduce:transition-none",
              phase === "fling" || phase === "settle" ? "bg-background/15" : "bg-background/0",
            )}
          >
            {/* 튀어나온 카드 — fling(무대 밖) → settle(화면 안 가장자리, 위로 떠) → return(더미 복귀).
                guide 단계에서 카드 자체가 클릭 타깃(클릭 = 점지 질문 게이트). */}
            <div
              role="button"
              tabIndex={popStep === "guide" ? 0 : -1}
              aria-label={tt.popTapHint}
              onClick={handleCardClick}
              onKeyDown={(e) => {
                if (popStep === "guide" && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setPopStep("question");
                }
              }}
              className={cn(
                "absolute top-1/2 left-1/2 outline-none motion-reduce:transition-none",
                popStep === "guide" && "cursor-pointer",
                phase === "fling" && "transition-transform duration-[850ms] ease-out",
                phase === "settle" && "transition-transform duration-[200ms] ease-out",
                phase === "return" && "transition-transform duration-[200ms] ease-in",
              )}
              style={{
                transform:
                  phase === "fling"
                    ? `translate(calc(-50% + ${pop.dir * pop.flingX}px), calc(-50% - 70px)) rotate(${pop.dir * 8}deg) scale(1.06)`
                    : phase === "settle"
                      ? `translate(calc(-50% + ${pop.dir * pop.settleX}px), calc(-50% - 70px)) rotate(0deg) scale(1)`
                      : phase === "return"
                        ? "translate(-50%, -50%) rotate(0deg) scale(0.9)"
                        : "translate(-50%, -50%) rotate(0deg) scale(0.92)",
              }}
            >
              <TarotCard
                face="back"
                size="md"
                className={cn(
                  "shadow-xl ring-2 ring-primary",
                  popStep === "guide" && "ring-4 ring-primary/80",
                )}
              />
            </div>

            {/* 2단계 guide — 징조 문구 + "이 카드를 눌러보세요". 손가락이 카드 아래에서 카드를 가리킴(통통). */}
            {popStep === "guide" && (
              <>
                {/* 위치 transform은 wrapper에, animate-bounce는 안쪽 글리프에 분리 —
                    같은 요소에 두면 bounce keyframe transform이 위치 transform을 덮어써
                    손가락이 카드 위치(dir*settleX)를 안 따라간다. 분리하면 두 transform이 합성된다. */}
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${pop.dir * pop.settleX}px), calc(-50% + 73px))`,
                  }}
                >
                  <span className="block animate-bounce text-3xl leading-none text-primary drop-shadow motion-reduce:animate-none">
                    ☝
                  </span>
                </span>
                <div className="absolute inset-x-0 bottom-[7%] flex animate-in flex-col items-center gap-2 px-6 text-center fade-in duration-300">
                  <p className="text-sm font-medium break-keep">{tt.popOmen}</p>
                  <p className="text-xs text-muted-foreground">{tt.popTapHint}</p>
                </div>
              </>
            )}

            {/* 3단계 question — 카드 클릭 후 점지 질문(손가락·징조 사라짐). 하단 고정(비겹침). */}
            {popStep === "question" && (
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
