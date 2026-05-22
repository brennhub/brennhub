"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SajuFormValues {
  year: number;
  month: number;
  day: number;
  hour: number;
  isLunar: boolean;
}

interface Props {
  onSubmit: (values: SajuFormValues) => void;
  loading: boolean;
}

const SELECT_CLASS =
  "mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:text-zinc-100";

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

export function SajuInputForm({ onSubmit, loading }: Props) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [isLunar, setIsLunar] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handle(e: FormEvent) {
    e.preventDefault();
    const y = Number(year);
    if (!year || !Number.isInteger(y) || y < 1000 || y > 2050) {
      setErr("생년을 1000~2050 사이로 입력하세요.");
      return;
    }
    if (!month || !day || !hour) {
      setErr("월·일·출생 시각을 모두 선택하세요.");
      return;
    }
    setErr(null);
    onSubmit({
      year: y,
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      isLunar,
    });
  }

  return (
    <form onSubmit={handle} className="mt-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="saju-year" className="text-sm">
            생년
          </Label>
          <Input
            id="saju-year"
            type="number"
            inputMode="numeric"
            placeholder="1990"
            min={1000}
            max={2050}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={loading}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="saju-month" className="text-sm">
            월
          </Label>
          <select
            id="saju-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={loading}
            className={SELECT_CLASS}
          >
            <option value="">선택</option>
            {range(1, 12).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="saju-day" className="text-sm">
            일
          </Label>
          <select
            id="saju-day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={loading}
            className={SELECT_CLASS}
          >
            <option value="">선택</option>
            {range(1, 31).map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="saju-hour" className="text-sm">
            출생 시각
          </Label>
          <select
            id="saju-hour"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            disabled={loading}
            className={SELECT_CLASS}
          >
            <option value="">선택</option>
            {range(0, 23).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}시
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            달력 기준
          </span>
          <div
            className="mt-1 inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
            role="group"
            aria-label="양력 또는 음력 선택"
          >
            {([false, true] as const).map((lunar) => {
              const active = lunar === isLunar;
              return (
                <button
                  key={String(lunar)}
                  type="button"
                  onClick={() => setIsLunar(lunar)}
                  aria-pressed={active}
                  disabled={loading}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    active
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                  )}
                >
                  {lunar ? "음력" : "양력"}
                </button>
              );
            })}
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "분석 중…" : "내 사주 보기"}
        </Button>
      </div>

      {err && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300">{err}</p>
      )}
    </form>
  );
}
