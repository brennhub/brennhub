"use client";

import { cn } from "@/lib/utils";

export type Step = 1 | 2 | 3;

type Props = {
  step: Step;
  /** [step1, step2, step3] 라벨. */
  labels: [string, string, string];
  onStep: (step: Step) => void;
};

/** 3스텝(슬롯·매핑 → 그리기 → 타이핑) 진행 네비게이션. */
export function StepNav({ step, labels, onStep }: Props) {
  const steps: Step[] = [1, 2, 3];
  return (
    <div
      role="tablist"
      aria-label="steps"
      className="flex flex-wrap items-center gap-2"
    >
      {steps.map((s, i) => {
        const active = s === step;
        return (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStep(s)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
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
