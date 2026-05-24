"use client";

import { cn } from "@/lib/utils";

/**
 * 0.8.0 (P3d): 설정+그리기 통합으로 3-step → 2-step 축소.
 *   1 = 만들기 (설정 + 그리기 + 검증·점수, 한 화면)
 *   2 = 플레이 (validation.ok 시에만 활성)
 */
export type Step = 1 | 2;

type Props = {
  step: Step;
  /** [step1, step2] 라벨. */
  labels: [string, string];
  onStep: (step: Step) => void;
  /** 비활성 step (예: 플레이는 검증 통과 시에만 활성). */
  disabledSteps?: readonly Step[];
};

export function StepNav({ step, labels, onStep, disabledSteps }: Props) {
  const steps: Step[] = [1, 2];
  const disabledSet = new Set(disabledSteps ?? []);
  return (
    <div
      role="tablist"
      aria-label="steps"
      className="flex flex-wrap items-center gap-2"
    >
      {steps.map((s, i) => {
        const active = s === step;
        const disabled = disabledSet.has(s);
        return (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onStep(s);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
                disabled &&
                  "cursor-not-allowed opacity-50 hover:text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {s}
              </span>
              {labels[i]}
            </button>
            {i < steps.length - 1 && (
              <span className="h-px w-4 bg-border" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
