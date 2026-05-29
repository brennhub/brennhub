"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "brennhub-theme";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * 첫 렌더부터 실제 테마와 정합하도록 초기값을 동기 산출.
 * 1순위: <html>.dark (layout의 THEME_INIT_SCRIPT가 paint 전 설정 — 시각적 source of truth)
 * 2순위: localStorage
 * SSR(document 없음): light.
 *
 * 이전엔 useState("light") 고정 후 useEffect 보정이라 state↔DOM desync 창이 있었고,
 * toggle이 stale state 기준 계산해 화이트모드에서 .dark가 안 지워지는 버그가 있었음.
 */
function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "dark") return "dark";
  } catch {
    // localStorage unavailable
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // state → DOM 동기화 (초기 + 모든 변경). DOM이 항상 state를 반영.
  useEffect(() => {
    applyClass(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore — 세션 내 적용은 유지
    }
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
