"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ColorScheme = "kr" | "us";

const STORAGE_KEY = "brennhub:color-scheme";
const DEFAULT_SCHEME: ColorScheme = "kr";

function isColorScheme(v: unknown): v is ColorScheme {
  return v === "kr" || v === "us";
}

type ColorSchemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (s: ColorScheme) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setSchemeState] = useState<ColorScheme>(DEFAULT_SCHEME);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isColorScheme(stored)) {
        setSchemeState(stored);
      }
    } catch {
      // localStorage unavailable; keep default
    }
  }, []);

  const setColorScheme = (s: ColorScheme) => {
    setSchemeState(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      // ignore — selection still applies in-session
    }
  };

  // Keep <html data-color-scheme> in sync so the CSS gain/loss tokens
  // update immediately on toggle. Decoupled from data-locale (which still
  // tracks language).
  useEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", colorScheme);
  }, [colorScheme]);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextValue {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) {
    throw new Error("useColorScheme must be used within ColorSchemeProvider");
  }
  return ctx;
}
