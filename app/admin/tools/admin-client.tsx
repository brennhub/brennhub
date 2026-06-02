"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Gamepad2,
  Grid3x3,
  Mail,
  MessageSquare,
  Pill,
  Sparkles,
  Tag,
  TrendingUp,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import { tools } from "@/lib/tools-registry";
import { messages as i18nMessages } from "@/lib/i18n/messages";

/**
 * 통합 visual editor — 도구 카드 텍스트 + 전역 line-clamp.
 * 미리보기 카드 = 실제 ToolCard와 동일 layout. description/name 클릭 → 인라인 편집.
 * line-clamp slider (전역) — 변경 시 즉시 모든 미리보기 반영.
 */

type Locale = "ko" | "en";
const LOCALES: Locale[] = ["ko", "en"];

const LINES_MIN = 2;
const LINES_MAX = 8;

const LINE_CLAMP_CLASS: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
  7: "line-clamp-7",
  8: "line-clamp-8",
};

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  "email-diag": Mail,
  "cron-trans": Clock,
  "tag-it": Tag,
  "stock-sim": TrendingUp,
  "supp-plan": Pill,
  "saju-naming": Sparkles,
  "lineup-builder": Users,
  "language-maker": Type,
  maze: Grid3x3,
  shooter: Gamepad2,
};

type OverrideRow = {
  tool_slug: string;
  locale: string;
  name: string | null;
  description: string | null;
  updated_at: number;
};

type Editable = {
  name: string;
  description: string;
  isOverride: boolean;
  dirty: boolean;
};

type ToolState = Record<Locale, Editable>;

function fileDefault(slug: string, locale: Locale): { name: string; description: string } {
  const localeTools = i18nMessages[locale].tools;
  return localeTools[slug] ?? { name: slug, description: "" };
}

export function ToolsAdminClient() {
  const [state, setState] = useState<Record<string, ToolState>>({});
  const [lines, setLines] = useState(3);
  const [linesDirty, setLinesDirty] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingLines, setSavingLines] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState<Locale>("ko");

  // 초기 로드: overrides + card settings 동시.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ovRes, settingsRes] = await Promise.all([
          fetch("/api/admin/tool-overrides", { credentials: "same-origin" }),
          fetch("/api/admin/hub-card-settings", { credentials: "same-origin" }),
        ]);
        if (!ovRes.ok) {
          setError(`overrides 불러오기 실패 (${ovRes.status})`);
          setLoading(false);
          return;
        }
        const ovBody = (await ovRes.json()) as { rows: OverrideRow[] };
        const overrideMap = new Map<string, OverrideRow>();
        for (const r of ovBody.rows) overrideMap.set(`${r.tool_slug}:${r.locale}`, r);

        const next: Record<string, ToolState> = {};
        for (const tool of tools) {
          const slugState: Partial<ToolState> = {};
          for (const locale of LOCALES) {
            const ovRow = overrideMap.get(`${tool.slug}:${locale}`);
            slugState[locale] = {
              name: ovRow?.name ?? "",
              description: ovRow?.description ?? "",
              isOverride: !!ovRow,
              dirty: false,
            };
          }
          next[tool.slug] = slugState as ToolState;
        }

        if (settingsRes.ok) {
          const sb = (await settingsRes.json()) as { description_lines: number };
          if (!cancelled) setLines(sb.description_lines);
        }
        if (!cancelled) {
          setState(next);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = useCallback(
    (slug: string, locale: Locale, field: "name" | "description", value: string) => {
      setState((prev) => ({
        ...prev,
        [slug]: {
          ...prev[slug],
          [locale]: {
            ...prev[slug][locale],
            [field]: value,
            dirty: true,
          },
        },
      }));
    },
    [],
  );

  const saveTool = useCallback(async (slug: string, locale: Locale) => {
    const cur = state[slug]?.[locale];
    if (!cur) return;
    const key = `${slug}:${locale}`;
    setSavingKey(key);
    try {
      const name = cur.name.trim();
      const desc = cur.description.trim();
      const noOverride = !name && !desc;
      const res = await fetch(
        `/api/admin/tool-overrides/${encodeURIComponent(slug)}?locale=${locale}`,
        noOverride
          ? { method: "DELETE", credentials: "same-origin" }
          : {
              method: "PUT",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                name: name || null,
                description: desc || null,
              }),
            },
      );
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          [slug]: {
            ...prev[slug],
            [locale]: noOverride
              ? { name: "", description: "", isOverride: false, dirty: false }
              : { ...prev[slug][locale], isOverride: true, dirty: false },
          },
        }));
      }
    } finally {
      setSavingKey(null);
    }
  }, [state]);

  const saveLines = useCallback(async () => {
    setSavingLines(true);
    try {
      const res = await fetch("/api/admin/hub-card-settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description_lines: lines }),
      });
      if (res.ok) setLinesDirty(false);
    } finally {
      setSavingLines(false);
    }
  }, [lines]);

  if (loading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">불러오는 중…</p>;
  }
  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  const clampClass = LINE_CLAMP_CLASS[lines] ?? "line-clamp-3";

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          도구 카드 편집
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          각 도구의 미리보기 카드에서 이름·설명을 직접 클릭해 다듬으세요.
          전체 카드의 설명 줄 수는 상단 슬라이더로 조절합니다.
        </p>
      </header>

      {/* 상단 컨트롤 — line-clamp slider + locale 토글 */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <label htmlFor="lines" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              설명 줄 수
            </label>
            <span className="tnum text-sm text-zinc-700 dark:text-zinc-300">{lines}</span>
          </div>
          <input
            id="lines"
            type="range"
            min={LINES_MIN}
            max={LINES_MAX}
            step={1}
            value={lines}
            onChange={(e) => {
              setLines(Number(e.target.value));
              setLinesDirty(true);
            }}
            className="mt-2 w-full"
          />
        </div>
        {linesDirty && (
          <button
            type="button"
            onClick={saveLines}
            disabled={savingLines}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {savingLines ? "저장 중…" : "줄 수 저장"}
          </button>
        )}
        <div className="flex items-center gap-1 rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setActiveLocale(loc)}
              className={
                "rounded px-3 py-1 text-xs font-medium transition-colors " +
                (activeLocale === loc
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800")
              }
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 — 실제 ToolCard 모양 + 인라인 편집 */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const cur = state[tool.slug]?.[activeLocale];
          if (!cur) return null;
          const def = fileDefault(tool.slug, activeLocale);
          const displayName = cur.name.trim() || def.name;
          const displayDesc = cur.description.trim() || def.description;
          const Icon = ICON_BY_SLUG[tool.slug] ?? Grid3x3;
          const key = `${tool.slug}:${activeLocale}`;
          const isSaving = savingKey === key;

          return (
            <li key={tool.id}>
              <div className="group relative flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                {/* source 배지 */}
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <span
                    className={
                      cur.isOverride
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }
                  >
                    {cur.isOverride ? "수정됨" : "기본값"}
                  </span>
                </div>

                <div className="flex flex-1 items-start gap-3 pr-16">
                  <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={cur.name}
                      onChange={(e) =>
                        updateField(tool.slug, activeLocale, "name", e.target.value)
                      }
                      placeholder={def.name}
                      className="w-full truncate rounded border border-transparent bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
                    />
                    <textarea
                      value={cur.description}
                      onChange={(e) =>
                        updateField(tool.slug, activeLocale, "description", e.target.value)
                      }
                      placeholder={def.description}
                      rows={Math.max(2, lines)}
                      className={`mt-1 w-full ${clampClass} resize-none rounded border border-transparent bg-transparent text-sm text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:text-zinc-400 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600`}
                    />
                    {!cur.name.trim() && !cur.description.trim() && (
                      <p className="mt-1 text-[10px] italic text-zinc-400 dark:text-zinc-500">
                        미리보기: {displayName}
                      </p>
                    )}
                  </div>
                </div>

                {/* 하단 row */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {tool.slug}
                  </span>
                  <div className="flex items-center gap-2">
                    {cur.dirty && (
                      <button
                        type="button"
                        onClick={() => saveTool(tool.slug, activeLocale)}
                        disabled={isSaving}
                        className="rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {isSaving ? "…" : "저장"}
                      </button>
                    )}
                    {cur.isOverride && !cur.dirty && (
                      <button
                        type="button"
                        onClick={() => {
                          updateField(tool.slug, activeLocale, "name", "");
                          updateField(tool.slug, activeLocale, "description", "");
                        }}
                        className="text-[10px] text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        기본값
                      </button>
                    )}
                    <MessageSquare
                      aria-hidden
                      className="size-4 text-zinc-300 dark:text-zinc-600"
                    />
                  </div>
                </div>
                {/* description 영역 표시 (편집 안 됐을 때 placeholder 미리보기) */}
                <p className="sr-only">{displayDesc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
