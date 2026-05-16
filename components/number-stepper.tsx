"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onStep: (newValue: number) => void;
  onInputChange: (text: string) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  className?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  "aria-label"?: string;
};

function roundForStep(value: number, step: number): number {
  const str = step.toString();
  const decimals = str.includes(".") ? str.split(".")[1].length : 0;
  return Number(value.toFixed(decimals));
}

export function NumberStepper({
  value,
  onStep,
  onInputChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  id,
  className,
  placeholder,
  inputMode = "decimal",
  "aria-label": ariaLabel,
}: Props) {
  const current = parseFloat(value);
  const valid = Number.isFinite(current);
  const base = valid
    ? current
    : Number.isFinite(min)
      ? Math.max(min, 0)
      : 0;
  const nextUp = base + step;
  const nextDown = base - step;
  const upDisabled = nextUp > max;
  const downDisabled = nextDown < min;

  const handleUp = () => {
    if (upDisabled) return;
    onStep(roundForStep(nextUp, step));
  };
  const handleDown = () => {
    if (downDisabled) return;
    onStep(roundForStep(nextDown, step));
  };

  return (
    <div
      className={cn(
        "flex h-8 w-full min-w-0 items-stretch rounded-lg border border-input bg-transparent transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "dark:bg-input/30",
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="tnum w-full min-w-0 bg-transparent px-2.5 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="flex shrink-0 flex-col border-l border-input">
        <button
          type="button"
          onClick={handleUp}
          disabled={upDisabled}
          aria-label="Increase"
          tabIndex={-1}
          className="flex h-4 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={handleDown}
          disabled={downDisabled}
          aria-label="Decrease"
          tabIndex={-1}
          className="flex h-4 w-6 items-center justify-center border-t border-input text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}
