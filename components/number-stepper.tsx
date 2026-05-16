"use client";

import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onStep: (newValue: number) => void;
  onInputChange: (text: string) => void;
  min?: number;
  max?: number;
  smallStep: number;
  bigStep: number;
  id?: string;
  className?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  "aria-label"?: string;
  maxReachedMessage?: string;
  minReachedMessage?: string;
};

function roundForStep(value: number, step: number): number {
  const str = step.toString();
  const decimals = str.includes(".") ? str.split(".")[1].length : 0;
  return Number(value.toFixed(decimals));
}

// Small step: round to nearest integer first if value is non-integer, otherwise
// step by smallStep. Big step always adds/subtracts bigStep.
function smartSmallStep(
  value: number,
  smallStep: number,
  direction: 1 | -1,
): number {
  if (!Number.isInteger(value)) {
    return direction === 1 ? Math.ceil(value) : Math.floor(value);
  }
  return value + direction * smallStep;
}

export function NumberStepper({
  value,
  onStep,
  onInputChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  smallStep,
  bigStep,
  id,
  className,
  placeholder,
  inputMode = "decimal",
  "aria-label": ariaLabel,
  maxReachedMessage,
  minReachedMessage,
}: Props) {
  const current = parseFloat(value);
  const valid = Number.isFinite(current);
  const base = valid
    ? current
    : Number.isFinite(min)
      ? Math.max(min, 0)
      : 0;

  // Clamp-based disabled: button is enabled while there's any room left.
  // Step clamps to min/max so users can always reach the boundary.
  const upDisabled = base >= max;
  const downDisabled = base <= min;

  const handleSmallUp = () => {
    if (upDisabled) return;
    const next = smartSmallStep(base, smallStep, 1);
    onStep(Math.min(max, roundForStep(next, smallStep)));
  };

  const handleBigUp = () => {
    if (upDisabled) return;
    onStep(Math.min(max, roundForStep(base + bigStep, bigStep)));
  };

  const handleSmallDown = () => {
    if (downDisabled) return;
    const next = smartSmallStep(base, smallStep, -1);
    onStep(Math.max(min, roundForStep(next, smallStep)));
  };

  const handleBigDown = () => {
    if (downDisabled) return;
    onStep(Math.max(min, roundForStep(base - bigStep, bigStep)));
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
      <div className="grid shrink-0 grid-cols-2 grid-rows-2 border-l border-input">
        <StepperButton
          onClick={handleSmallUp}
          disabled={upDisabled}
          title={upDisabled ? maxReachedMessage : undefined}
          aria-label="Increase small"
        >
          <ChevronUp className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={handleBigUp}
          disabled={upDisabled}
          title={upDisabled ? maxReachedMessage : undefined}
          aria-label="Increase big"
          borderLeft
        >
          <ChevronsUp className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={handleSmallDown}
          disabled={downDisabled}
          title={downDisabled ? minReachedMessage : undefined}
          aria-label="Decrease small"
          borderTop
        >
          <ChevronDown className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={handleBigDown}
          disabled={downDisabled}
          title={downDisabled ? minReachedMessage : undefined}
          aria-label="Decrease big"
          borderLeft
          borderTop
        >
          <ChevronsDown className="size-3" />
        </StepperButton>
      </div>
    </div>
  );
}

function StepperButton({
  onClick,
  disabled,
  title,
  children,
  borderLeft,
  borderTop,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  title?: string;
  children: React.ReactNode;
  borderLeft?: boolean;
  borderTop?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cn(
        "flex h-4 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        borderLeft && "border-l border-input",
        borderTop && "border-t border-input",
      )}
    >
      {children}
    </button>
  );
}
