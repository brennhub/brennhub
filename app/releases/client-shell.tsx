"use client";

import Link from "next/link";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import type { Release, ReleaseKind } from "@/lib/releases";

export function ReleasesClientShell({ items }: { items: Release[] }) {
  const t = useMessages();
  const r = t.releases;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t.toolCommon.back}
      </Link>

      <header className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {r.title}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">{r.subtitle}</p>
      </header>

      <ol className="mt-10 space-y-6">
        {items.map((item) => (
          <ReleaseItem key={item.id} item={item} />
        ))}
      </ol>
    </main>
  );
}

function ReleaseItem({ item }: { item: Release }) {
  const t = useMessages();
  const { locale } = useLocale();
  const r = t.releases;

  const dateLabel = new Date(`${item.date}T00:00:00Z`).toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  const toolLabel =
    item.tool === "site"
      ? r.toolSite
      : (t.tools[item.tool]?.name ?? item.tool);

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">{dateLabel}</span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {toolLabel}
        </span>
        {item.kind && <KindBadge kind={item.kind} label={r.kind[item.kind]} />}
      </div>
      <h2 className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-50">
        {item.title[locale]}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {item.body[locale]}
      </p>
    </li>
  );
}

function KindBadge({ kind, label }: { kind: ReleaseKind; label: string }) {
  const cls =
    kind === "new"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : kind === "improved"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>
      {label}
    </span>
  );
}
