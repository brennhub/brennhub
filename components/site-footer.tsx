"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";

export function SiteFooter() {
  const t = useMessages();
  const cls =
    "text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-6">
      <Link href="/releases" className={cls}>
        {t.footer.releases}
      </Link>
      <span className="text-xs text-zinc-300 dark:text-zinc-700" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className={cls}>
        {t.footer.privacy}
      </Link>
    </footer>
  );
}
