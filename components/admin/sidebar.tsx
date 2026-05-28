"use client";

/**
 * Admin 사이드바 — registry 기반 동적 메뉴.
 * 모바일: 상단 stack (md 미만에서 nav가 본문 위), 데스크톱: 좌측 fixed-width 200px.
 * 현재 경로 강조는 usePathname().
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminMenu } from "@/lib/admin/registry";
import { useMessages } from "@/lib/i18n/provider";

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useMessages().admin;

  return (
    <nav
      aria-label={t.title}
      className="md:w-48 md:shrink-0 md:sticky md:top-6 md:self-start"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {t.title}
      </h2>
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {adminMenu.map((item) => {
          const active = pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={
                  "block whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900")
                }
              >
                {t.menu[item.labelKey]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
