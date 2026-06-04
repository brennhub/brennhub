"use client";

import { cn } from "@/lib/utils";

type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * 가로 분할 세그먼트 컨트롤 (강도 5칸 · 모드 2칸 공용).
 * 각 칸 통째 클릭(Fitts) · 선택 칸 채움 + 나머지 외곽선 · ←→ 키보드 + radiogroup aria.
 * refined minimal — brennhub zinc 토큰만 사용.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  const idx = options.findIndex((o) => o.value === value);

  const move = (delta: number) => {
    const next = (idx + delta + options.length) % options.length;
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        }
      }}
      className={cn(
        "flex w-full overflow-hidden rounded-md border border-border",
        className,
      )}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-9 flex-1 px-2 py-1.5 text-center text-sm font-medium outline-none transition-colors",
              i > 0 && "border-l border-border",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
