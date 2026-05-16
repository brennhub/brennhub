"use client";

import { useEffect, useState } from "react";
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
  onInputBlur?: () => void;
  displayFormatter?: (raw: string) => string;
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

const FADE_START_MS = 2500;
const REMOVE_MS = 3000;

export function NumberStepper({
  value,
  onStep,
  onInputChange,
  onInputBlur,
  displayFormatter,
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

  const [focused, setFocused] = useState(false);
  const [warning, setWarning] = useState<{
    msg: string;
    key: number;
  } | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!warning) return;
    setClosing(false);
    const fadeId = setTimeout(() => setClosing(true), FADE_START_MS);
    const removeId = setTimeout(() => {
      setWarning(null);
      setClosing(false);
    }, REMOVE_MS);
    return () => {
      clearTimeout(fadeId);
      clearTimeout(removeId);
    };
  }, [warning?.key]);

  const showWarning = (msg: string | undefined) => {
    if (!msg) return;
    setWarning({ msg, key: Date.now() });
  };

  const dismissWarning = () => {
    setWarning(null);
    setClosing(false);
  };

  const handleSmallUp = () => {
    if (base >= max) {
      showWarning(maxReachedMessage);
      return;
    }
    const next = smartSmallStep(base, smallStep, 1);
    onStep(Math.min(max, roundForStep(next, smallStep)));
  };

  const handleBigUp = () => {
    if (base >= max) {
      showWarning(maxReachedMessage);
      return;
    }
    onStep(Math.min(max, roundForStep(base + bigStep, bigStep)));
  };

  const handleSmallDown = () => {
    if (base <= min) {
      showWarning(minReachedMessage);
      return;
    }
    const next = smartSmallStep(base, smallStep, -1);
    onStep(Math.max(min, roundForStep(next, smallStep)));
  };

  const handleBigDown = () => {
    if (base <= min) {
      showWarning(minReachedMessage);
      return;
    }
    onStep(Math.max(min, roundForStep(base - bigStep, bigStep)));
  };

  const displayValue =
    focused || !displayFormatter ? value : displayFormatter(value);

  return (
    <div
      className={cn(
        "relative flex h-8 w-full min-w-0 items-stretch rounded-lg border border-input bg-transparent transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "dark:bg-input/30",
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={displayValue}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onInputBlur?.();
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="tnum w-full min-w-0 bg-transparent px-2.5 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="grid shrink-0 grid-cols-2 grid-rows-2 border-l border-input">
        <StepperButton onClick={handleSmallUp} aria-label="Increase small">
          <ChevronUp className="size-3" />
        </StepperButton>
        <StepperButton onClick={handleBigUp} aria-label="Increase big" borderLeft>
          <ChevronsUp className="size-3" />
        </StepperButton>
        <StepperButton onClick={handleSmallDown} aria-label="Decrease small" borderTop>
          <ChevronDown className="size-3" />
        </StepperButton>
        <StepperButton
          onClick={handleBigDown}
          aria-label="Decrease big"
          borderLeft
          borderTop
        >
          <ChevronsDown className="size-3" />
        </StepperButton>
      </div>
      {warning && (
        <div
          role="alert"
          onClick={dismissWarning}
          style={{ opacity: closing ? 0 : 1 }}
          className="absolute bottom-full left-0 z-50 mb-1 cursor-pointer whitespace-nowrap rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm transition-opacity duration-500 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {warning.msg}
        </div>
      )}
    </div>
  );
}

function StepperButton({
  onClick,
  children,
  borderLeft,
  borderTop,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  borderLeft?: boolean;
  borderTop?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cn(
        "flex h-4 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        borderLeft && "border-l border-input",
        borderTop && "border-t border-input",
      )}
    >
      {children}
    </button>
  );
}
