"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { stepIngredientIndexes } from "@/lib/recipe-note/parse";
import { scaleIngredientText } from "@/lib/recipe-note/scale";
import type { Ingredient, Step } from "@/lib/recipe-note/types";

/**
 * 조리 모드 (기획서 §2-3).
 *
 * 열람 화면 내부 상태다 — 라우트를 옮기지 않는다. 젖은 손으로 뒤로가기를
 * 누르는 상황을 만들지 않기 위해서다.
 */

type Props = {
  steps: Step[];
  ingredients: Ingredient[];
  multiplier: number;
  onExit: () => void;
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 화면 꺼짐 방지. 미지원 브라우저는 조용히 무시한다 — 기능 저하는 수용하되
 * 에러 토스트로 사용자를 괴롭히지 않는다 (기획서 §2-3).
 */
function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (sentinelRef.current) return;
    try {
      sentinelRef.current = await navigator.wakeLock.request("screen");
      sentinelRef.current.addEventListener("release", () => {
        sentinelRef.current = null;
      });
    } catch {
      // 배터리 절약 모드 등에서 거부될 수 있다 — 조용히 포기.
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    void acquire();

    // 탭이 가려지면 브라우저가 lock을 회수한다 — 돌아올 때 다시 잡는다.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active, acquire]);
}

export function CookMode({ steps, ingredients, multiplier, onExit }: Props) {
  const t = useMessages().recipeNote;
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const timerSec = step?.timerSec ?? null;

  /**
   * 타이머는 **끝나는 시각**을 기준으로 센다 (남은 초를 1씩 빼지 않는다).
   * 요리 타이머는 정확해야 하는데, 초 감소식은 매 틱 렌더 지연만큼 밀리고
   * 탭이 백그라운드로 가면 브라우저가 interval을 조여 크게 어긋난다.
   * 마감 시각 방식은 탭이 잠들었다 깨어나도 남은 시간이 맞다.
   */
  const [remaining, setRemaining] = useState<number | null>(timerSec);
  const [deadline, setDeadline] = useState<number | null>(null);
  const running = deadline !== null;

  useWakeLock(true);

  // 단계가 바뀌면 타이머는 그 단계의 값으로 되돌아간다 (자동 시작 X).
  useEffect(() => {
    setRemaining(timerSec);
    setDeadline(null);
  }, [timerSec, index]);

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setDeadline(null);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  function toggleTimer() {
    if (running) {
      setDeadline(null);
      return;
    }
    // 다 흐른 타이머를 다시 누르면 그 단계 시간으로 되감는다.
    const base = remaining !== null && remaining > 0 ? remaining : timerSec;
    if (base === null || base <= 0) return;
    setRemaining(base);
    setDeadline(Date.now() + base * 1000);
  }

  // 재료 이름 토큰 계산은 재료 수에 비례한다 — 단계를 넘길 때만 다시 돌게 묶는다.
  const stepIngredients = useMemo(
    () =>
      step
        ? stepIngredientIndexes(step.text, ingredients).map(
            (i) => ingredients[i],
          )
        : [],
    [step, ingredients],
  );

  if (!step) return null;

  const total = steps.length;
  const isLast = index === total - 1;
  const finished = remaining !== null && remaining <= 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <span className="tnum text-sm font-medium text-muted-foreground">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <X className="size-3.5" />
          {t.cookExit}
        </button>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <p className="mt-8 text-xl leading-relaxed text-foreground">{step.text}</p>

      {remaining !== null && (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTimer}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span className="tnum text-lg">{formatClock(remaining)}</span>
          </button>
          <span className="text-sm text-muted-foreground">
            {finished ? t.timerDone : running ? t.timerPause : t.timerStart}
          </span>
        </div>
      )}

      {stepIngredients.length > 0 && (
        <p className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {t.cookStepIngredients}
          </span>{" "}
          ·{" "}
          {stepIngredients
            .map((ing) => {
              const line = scaleIngredientText(ing, multiplier);
              const text = `${line.before}${line.amount}${line.after}`;
              return ing.optional ? `${text} ${t.optionalView}` : text;
            })
            .join(" · ")}
        </p>
      )}

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-3 font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          {t.cookPrev}
        </button>
        <button
          type="button"
          onClick={() => (isLast ? onExit() : setIndex((i) => i + 1))}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {isLast ? t.cookDone : t.cookNext}
          {!isLast && <ArrowRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}
