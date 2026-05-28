"use client";

/**
 * Admin 대시보드 헤더 (제목 + 인트로). i18n provider가 client hook이라 분리.
 */

import { useMessages } from "@/lib/i18n/provider";

export function DashboardHeader() {
  const t = useMessages().admin;
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t.dashboardTitle}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {t.dashboardIntro}
      </p>
    </header>
  );
}
