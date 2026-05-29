"use client";

import { useEffect, useRef, useState } from "react";
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
  showBigStep?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  "aria-label"?: string;
  maxReachedMessage?: string;
  minReachedMessage?: string;
  disabled?: boolean;
  /**
   * 외부 `value` prop이 focused 동안 변경되면 input 표시값에 강제 동기화한다.
   *
   * default `false` (1.0.1 hotfix): focused 중엔 사용자 입력(localText) 보존 →
   * `value` prop이 onInputChange 결과로 clamp/변환되어 돌아와도 input은 raw 입력
   * 표시. blur·Enter에서만 `value`로 정리. → maze NumberStepper "두 자리 수 입력
   * 불가" 버그 해소.
   *
   * `true` 옵션: 부모가 사용자 입력을 "변환된 결과 state"(예: 시간 string 파싱
   * → fmt 변환 → string)에 묶는 경우 사용. 사용자 입력이 valid 범위 밖이면
   * value prop이 onInputChange 후에도 변경 안 됨 → focused 중 동기화 skip하면
   * raw 입력이 잠시 보임 → blur에야 정리. 즉시 튕기는 기존 동작이 필요한 경우만.
   * 현재 소비처: supp-plan time-stepper(hour·minute), schedule-form capsules.
   */
  syncWhileFocused?: boolean;
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
  showBigStep = true,
  id,
  className,
  placeholder,
  inputMode = "decimal",
  "aria-label": ariaLabel,
  maxReachedMessage,
  minReachedMessage,
  disabled = false,
  syncWhileFocused = false,
}: Props) {
  const current = parseFloat(value);
  const valid = Number.isFinite(current);
  const base = valid
    ? current
    : Number.isFinite(min)
      ? Math.max(min, 0)
      : 0;

  const [focused, setFocused] = useState(false);
  // 1.0.1 hotfix: input 표시 버퍼. focused 동안엔 외부 value prop 변경에도 사용자
  // 입력 보존 — parent의 clamp/변환 결과가 즉시 input을 덮어쓰는 일을 막음.
  const [localText, setLocalText] = useState<string>(value);
  // 외부 value prop이 변경되면:
  //  - focused가 아닐 때 → localText에 강제 동기화 (blur 후 정리 / 외부 setState 등)
  //  - focused 중엔 → default skip (사용자 입력 보존). syncWhileFocused=true면 동기화.
  useEffect(() => {
    if (!focused || syncWhileFocused) {
      setLocalText(value);
    }
  }, [value, focused, syncWhileFocused]);
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

  // 표시값: focused 중엔 localText (사용자 raw 입력) 보임. blur 후엔 displayFormatter
  // 또는 value 그대로. focused 중에도 displayFormatter 적용은 기존 동작 유지 X
  // (편집 input에 formatted 텍스트 들어가면 caret 위치 어긋남) — 기존 패턴 보존.
  const displayValue = focused
    ? localText
    : displayFormatter
      ? displayFormatter(value)
      : value;

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
        onChange={(e) => {
          // 1.0.1: keystroke마다 localText 갱신 + onInputChange 호출.
          // 호출 시점은 기존 그대로 — 다른 도구(stock-sim·supp-plan·lineup-builder)
          // 의 live 갱신 동작 유지. clamp·parse는 부모 책임.
          setLocalText(e.target.value);
          onInputChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          // blur 시 외부 value prop과 강제 동기화 — parent가 clamp/변환한 결과가
          // input에 반영됨 (focused 중 보류된 raw 입력이 정리됨).
          setLocalText(value);
          onInputBlur?.();
        }}
        onKeyDown={(e) => {
          // Enter는 blur 트리거 — 즉시 commit + 표시 정리. form submit 차단.
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className="tnum w-full min-w-0 bg-transparent px-2.5 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
      />
      {showBigStep ? (
        <div
          className={cn(
            "grid shrink-0 grid-cols-2 grid-rows-2 border-l border-input",
            disabled && "pointer-events-none opacity-50",
          )}
        >
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
      ) : (
        <div
          className={cn(
            "flex shrink-0 flex-col border-l border-input",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <StepperButton onClick={handleSmallUp} aria-label="Increase">
            <ChevronUp className="size-3" />
          </StepperButton>
          <StepperButton onClick={handleSmallDown} aria-label="Decrease" borderTop>
            <ChevronDown className="size-3" />
          </StepperButton>
        </div>
      )}
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
