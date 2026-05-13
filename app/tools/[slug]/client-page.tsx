"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import type { Tool } from "@/lib/tools-registry";

export function ClientSlugPage({ tool }: { tool: Tool }) {
  const t = useMessages();
  const display = t.tools[tool.slug] ?? { name: tool.slug, description: "" };
  const isLive = tool.status === "live";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t.toolCommon.back}
      </Link>
      <header className="mt-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {display.name}
          </h1>
          <span
            className={
              isLive
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }
          >
            {isLive ? t.toolCommon.live : t.toolCommon.soon}
          </span>
        </div>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {display.description}
        </p>
      </header>

      <section className="mt-12 rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
        <p className="text-zinc-500 dark:text-zinc-400">
          {t.toolCommon.comingSoon}
        </p>
      </section>
    </main>
  );
}
