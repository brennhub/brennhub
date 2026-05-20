"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import {
  DEFAULT_FORMATION_ID,
  getFormation,
} from "@/lib/lineup-builder/formations";
import { Pitch } from "@/components/lineup-builder/pitch";
import { FormationSelect } from "@/components/lineup-builder/formation-select";

export function LineupBuilderClientShell() {
  const t = useMessages();
  const tl = t.lineupBuilder;
  const formation = getFormation(DEFAULT_FORMATION_ID);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.toolCommon.back}
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {tl.title}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {tl.description}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside>
          <FormationSelect
            value={DEFAULT_FORMATION_ID}
            label={tl.formationLabel}
          />
        </aside>
        <div className="mx-auto w-full max-w-md">
          <Pitch formation={formation} />
        </div>
      </div>
    </main>
  );
}
