"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/switch";
import { NumberStepper } from "@/components/number-stepper";
import { cn } from "@/lib/utils";
import type { ExtractOptions } from "@/lib/tag-it/types";

type Props = {
  options: ExtractOptions;
  onChange: (next: ExtractOptions) => void;
  labels: {
    advancedTitle: string;
    removeJosaLabel: string;
    removeJosaHint: string;
    nounFocusLabel: string;
    nounFocusHint: string;
    scopeLabel: string;
    scopeBody: string;
    scopeTables: string;
    minFreqLabel: string;
    minFreqHint: string;
  };
};

/**
 * 고급 옵션 (기획서 §3.6 / D). 똑똑한 기본값 + 접힌 고급 패널.
 * 본문(body)은 MVP에서 고정 ON — 체크박스는 보이되 비활성.
 */
export function AdvancedPanel({ options, onChange, labels }: Props) {
  const [open, setOpen] = useState(false);

  const set = (patch: Partial<ExtractOptions>) =>
    onChange({ ...options, ...patch });

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        {labels.advancedTitle}
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-4 py-4">
          {/* 조사 제거 */}
          <Row label={labels.removeJosaLabel} hint={labels.removeJosaHint}>
            <Switch
              checked={options.removeJosa}
              onCheckedChange={(v) => set({ removeJosa: v })}
              aria-label={labels.removeJosaLabel}
            />
          </Row>

          {/* 명사 위주 */}
          <Row label={labels.nounFocusLabel} hint={labels.nounFocusHint}>
            <Switch
              checked={options.nounFocus}
              onCheckedChange={(v) => set({ nounFocus: v })}
              aria-label={labels.nounFocusLabel}
            />
          </Row>

          {/* 읽기 범위 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {labels.scopeLabel}
            </p>
            <div className="flex flex-wrap gap-4">
              <ScopeCheck checked disabled label={labels.scopeBody} />
              <ScopeCheck
                checked={options.scope.tables}
                label={labels.scopeTables}
                onChange={(v) =>
                  set({ scope: { ...options.scope, tables: v } })
                }
              />
            </div>
          </div>

          {/* 최소 빈도 컷 */}
          <Row label={labels.minFreqLabel} hint={labels.minFreqHint}>
            <NumberStepper
              value={String(options.minFreq)}
              min={1}
              max={20}
              smallStep={1}
              bigStep={5}
              showBigStep={false}
              inputMode="numeric"
              aria-label={labels.minFreqLabel}
              className="w-28"
              onStep={(n) => set({ minFreq: n })}
              onInputChange={(text) => {
                const n = Number.parseInt(text, 10);
                if (Number.isFinite(n) && n >= 1) set({ minFreq: n });
              }}
            />
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function ScopeCheck({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm",
        disabled ? "text-muted-foreground" : "cursor-pointer text-foreground",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}
