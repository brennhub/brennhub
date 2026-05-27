"use client";

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";

export function SiteFooter() {
  const t = useMessages();
  return (
    <footer className="mt-auto px-6 py-6 text-center">
      <Link
        href="/privacy"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {t.footer.privacy}
      </Link>
    </footer>
  );
}
