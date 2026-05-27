"use client";

/**
 * 대시보드 메뉴 카드 — Link wrapper.
 * MVP: title만. 향후 description / 통계 prop 추가 여지.
 *
 * i18n provider가 client hook이라 본 컴포넌트도 client.
 */

import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import type { AdminMenuItem } from "@/lib/admin/registry";

interface Props {
  item: AdminMenuItem;
}

export function AdminDashboardCard({ item }: Props) {
  const t = useMessages().admin;
  return (
    <Link
      href={item.path}
      className="block rounded-lg border border-zinc-200 bg-white px-5 py-4 text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span className="text-base font-medium">{t.menu[item.labelKey]}</span>
      <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
        {item.path}
      </span>
    </Link>
  );
}
