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
  const base = Number.isFinite(current)
    ? current
    : Number.isFinite(min)
      ? Math.max(min, 0)
      : 0;

  const candidates = {
    smallUp: base + smallStep,
    bigUp: base + bigStep,
    smallDown: base - smallStep,
    bigDown: base - bigStep,
  };

  const smallUpDisabled = candidates.smallUp > max;
  const bigUpDisabled = candidates.bigUp > max;
  const smallDownDisabled = candidates.smallDown < min;
  const bigDownDisabled = candidates.bigDown < min;

  const handle = (next: number, step: number) => {
    onStep(roundForStep(next, step));
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
          onClick={() => handle(candidates.smallUp, smallStep)}
          disabled={smallUpDisabled}
          title={smallUpDisabled ? maxReachedMessage : undefined}
          aria-label="Increase small"
        >
          <ChevronUp className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={() => handle(candidates.bigUp, bigStep)}
          disabled={bigUpDisabled}
          title={bigUpDisabled ? maxReachedMessage : undefined}
          aria-label="Increase big"
          borderLeft
        >
          <ChevronsUp className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={() => handle(candidates.smallDown, smallStep)}
          disabled={smallDownDisabled}
          title={smallDownDisabled ? minReachedMessage : undefined}
          aria-label="Decrease small"
          borderTop
        >
          <ChevronDown className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={() => handle(candidates.bigDown, bigStep)}
          disabled={bigDownDisabled}
          title={bigDownDisabled ? minReachedMessage : undefined}
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
