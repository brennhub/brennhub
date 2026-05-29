"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  // theme 초기값이 DOM에서 동기 산출되므로 server("light")와 client-initial이
  // 어긋날 수 있음. theme 의존 출력(아이콘/aria)을 mount 후로 게이트 → hydration mismatch 0.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (pathname?.startsWith("/admin")) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted ? (isDark ? "Light mode" : "Dark mode") : "Toggle theme"
      }
      aria-pressed={mounted ? isDark : undefined}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-3.5" />
        ) : (
          <Moon className="size-3.5" />
        )
      ) : null}
    </button>
  );
}
