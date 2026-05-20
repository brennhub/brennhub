"use client";

import { FORMATIONS } from "@/lib/lineup-builder/formations";
import type { FormationId } from "@/lib/lineup-builder/types";

type Props = {
  value: FormationId;
  label: string;
  // 미전달 시 비활성 렌더 (선택 핸들러는 Task B에서 주입).
  onChange?: (id: FormationId) => void;
};

export function FormationSelect({ value, label, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="lineup-formation"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <select
        id="lineup-formation"
        value={value}
        disabled={!onChange}
        onChange={
          onChange
            ? (e) => onChange(e.target.value as FormationId)
            : undefined
        }
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
      >
        {FORMATIONS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
