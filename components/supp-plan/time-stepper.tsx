"use client";

import { useMessages } from "@/lib/i18n/provider";
import { NumberStepper } from "@/components/number-stepper";

type Props = {
  value: string; // "HH:MM" 24h
  onChange: (v: string) => void;
};

function parse24(v: string): { hour24: number; minute: number } {
  const [h, m] = v.split(":").map((n) => parseInt(n, 10));
  return {
    hour24: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 8,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
  };
}

function to12(hour24: number): { hour12: number; pm: boolean } {
  const pm = hour24 >= 12;
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, pm };
}

function to24(hour12: number, pm: boolean): number {
  if (hour12 === 12) return pm ? 12 : 0;
  return pm ? hour12 + 12 : hour12;
}

function fmt(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function roundMinTo5(m: number): number {
  return Math.round(m / 5) * 5 % 60;
}

export function TimeStepper({ value, onChange }: Props) {
  const tp = useMessages().suppPlan;
  const { hour24, minute } = parse24(value);
  const { hour12, pm } = to12(hour24);
  const m5 = roundMinTo5(minute);

  const setHour12 = (h: number) => {
    if (h < 1 || h > 12) return;
    onChange(fmt(to24(h, pm), m5));
  };
  const setMinute = (newM: number) => {
    if (newM < 0 || newM > 55) return;
    onChange(fmt(hour24, newM));
  };
  const setPm = (newPm: boolean) => {
    onChange(fmt(to24(hour12, newPm), m5));
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Labelled label={tp.timeHour}>
        <NumberStepper
          value={String(hour12)}
          onStep={setHour12}
          onInputChange={(text) => {
            const n = parseInt(text.replace(/[^\d]/g, ""), 10);
            if (Number.isFinite(n) && n >= 1 && n <= 12) {
              onChange(fmt(to24(n, pm), m5));
            }
          }}
          min={1}
          max={12}
          smallStep={1}
          bigStep={3}
          showBigStep={false}
          inputMode="numeric"
          aria-label={tp.timeHour}
          className="w-20"
        />
      </Labelled>
      <Labelled label={tp.timeMinute}>
        <NumberStepper
          value={String(m5).padStart(2, "0")}
          onStep={setMinute}
          onInputChange={(text) => {
            const n = parseInt(text.replace(/[^\d]/g, ""), 10);
            if (Number.isFinite(n) && n >= 0 && n <= 55) {
              onChange(fmt(hour24, roundMinTo5(n)));
            }
          }}
          min={0}
          max={55}
          smallStep={5}
          bigStep={15}
          showBigStep={false}
          inputMode="numeric"
          aria-label={tp.timeMinute}
          className="w-20"
        />
      </Labelled>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setPm(false)}
          className={chipCls(!pm)}
          aria-pressed={!pm}
        >
          {tp.timeAM}
        </button>
        <button
          type="button"
          onClick={() => setPm(true)}
          className={chipCls(pm)}
          aria-pressed={pm}
        >
          {tp.timePM}
        </button>
      </div>
    </div>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.7rem]">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function chipCls(active: boolean): string {
  return [
    "h-8 rounded-md px-3 text-xs font-medium transition-colors",
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ].join(" ");
}
