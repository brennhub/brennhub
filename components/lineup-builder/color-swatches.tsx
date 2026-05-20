"use client";

import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

export const TEAM_COLORS = [
  "#dc2626", // 빨강
  "#1e40af", // 파랑
  "#171717", // 검정
  "#f5f5f4", // 흰색
  "#eab308", // 노랑
  "#16a34a", // 초록
  "#ea580c", // 주황
  "#7c3aed", // 보라
] as const;

export const DEFAULT_TEAM_COLOR = "#1e40af";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorSwatches({ value, onChange }: Props) {
  const t = useMessages().lineupBuilder;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {t.teamColorLabel}
      </span>
      <div className="flex flex-wrap gap-2">
        {TEAM_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={color}
            aria-pressed={value === color}
            className={cn(
              "h-7 w-7 rounded-full border border-zinc-300 transition-transform dark:border-zinc-600",
              value === color
                ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-zinc-50 dark:ring-zinc-100 dark:ring-offset-zinc-900"
                : "hover:scale-110",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
