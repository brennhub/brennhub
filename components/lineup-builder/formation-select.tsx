"use client";

import { FORMATIONS } from "@/lib/lineup-builder/formations";
import type { FormationId } from "@/lib/lineup-builder/types";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  value: FormationId;
  onChange: (id: FormationId) => void;
};

export function FormationSelect({ value, onChange }: Props) {
  const t = useMessages().lineupBuilder;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="lineup-formation"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {t.formationLabel}
      </label>
      <select
        id="lineup-formation"
        value={value}
        onChange={(e) => onChange(e.target.value as FormationId)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
      >
        {FORMATIONS.map((f) => (
          <option key={f.id} value={f.id}>
            {t.formations[f.id]}
          </option>
        ))}
      </select>
    </div>
  );
}
