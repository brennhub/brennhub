"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
 * 도구 카드 편집 — 단일 미리보기 카드 안에서 인라인 편집.
 * 도구는 상단 dropdown으로 선택, locale은 KO/EN 토글.
 * 저장하면 D1 tool_overrides에 INSERT OR REPLACE. 비우고 저장 = DELETE.
 */

type Locale = "ko" | "en";
const LOCALES: Locale[] = ["ko", "en"];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState(tools[0]?.slug ?? "");
  const [activeLocale, setActiveLocale] = useState<Locale>("ko");
  const [saving, setSaving] = useState(false);

  // 초기 로드.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/tool-overrides", { credentials: "same-origin" });
        if (!res.ok) {
          setError(`불러오기 실패 (${res.status})`);
          setLoading(false);
          return;
        }
        const body = (await res.json()) as { rows: OverrideRow[] };
        const map = new Map<string, OverrideRow>();
        for (const r of body.rows) map.set(`${r.tool_slug}:${r.locale}`, r);

        const next: Record<string, ToolState> = {};
        for (const tool of tools) {
          const slugState: Partial<ToolState> = {};
          for (const locale of LOCALES) {
            const row = map.get(`${tool.slug}:${locale}`);
            slugState[locale] = {
              name: row?.name ?? "",
              description: row?.description ?? "",
              isOverride: !!row,
              dirty: false,
            };
          }
          next[tool.slug] = slugState as ToolState;
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
    (field: "name" | "description", value: string) => {
      setState((prev) => ({
        ...prev,
        [selectedSlug]: {
          ...prev[selectedSlug],
          [activeLocale]: {
            ...prev[selectedSlug][activeLocale],
            [field]: value,
            dirty: true,
          },
        },
      }));
    },
    [selectedSlug, activeLocale],
  );

  const save = useCallback(async () => {
    const cur = state[selectedSlug]?.[activeLocale];
    if (!cur) return;
    setSaving(true);
    try {
      const name = cur.name.trim();
      const desc = cur.description.trim();
      const noOverride = !name && !desc;
      const res = await fetch(
        `/api/admin/tool-overrides/${encodeURIComponent(selectedSlug)}?locale=${activeLocale}`,
        noOverride
          ? { method: "DELETE", credentials: "same-origin" }
          : {
              method: "PUT",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name: name || null, description: desc || null }),
            },
      );
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          [selectedSlug]: {
            ...prev[selectedSlug],
            [activeLocale]: noOverride
              ? { name: "", description: "", isOverride: false, dirty: false }
              : { ...prev[selectedSlug][activeLocale], isOverride: true, dirty: false },
          },
        }));
      }
    } finally {
      setSaving(false);
    }
  }, [selectedSlug, activeLocale, state]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      [selectedSlug]: {
        ...prev[selectedSlug],
        [activeLocale]: {
          name: "",
          description: "",
          isOverride: prev[selectedSlug][activeLocale].isOverride,
          dirty: true,
        },
      },
    }));
  }, [selectedSlug, activeLocale]);

  const selectedTool = useMemo(
    () => tools.find((t) => t.slug === selectedSlug),
    [selectedSlug],
  );

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
  if (!selectedTool) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">도구가 없습니다.</p>;
  }

  const cur = state[selectedSlug]?.[activeLocale];
  if (!cur) return null;

  const def = fileDefault(selectedSlug, activeLocale);
  const Icon = ICON_BY_SLUG[selectedSlug] ?? Grid3x3;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          도구 카드 편집
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          미리보기 카드 안에서 이름·설명을 직접 다듬으세요. placeholder = 파일 기본값.
        </p>
      </header>

      {/* 컨트롤 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">도구</span>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {tools.map((t) => (
              <option key={t.slug} value={t.slug}>
                {fileDefault(t.slug, "ko").name} ({t.slug})
              </option>
            ))}
          </select>
        </label>
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

      {/* 단일 미리보기 카드 — 실제 ToolCard와 동일 layout */}
      <div className="max-w-md">
        <div className="group relative flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-1 items-start gap-3 pr-20">
            <Icon
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-zinc-500 dark:text-zinc-400"
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={cur.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={def.name}
                className="w-full truncate rounded border border-transparent bg-transparent text-lg font-medium text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:hover:border-zinc-700 dark:focus:border-zinc-600"
              />
              <textarea
                value={cur.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder={def.description}
                rows={4}
                className="mt-1 w-full resize-none rounded border border-transparent bg-transparent text-sm text-zinc-600 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none dark:text-zinc-400 dark:placeholder:text-zinc-600 dark:hover:border-zinc-700 dark:focus:border-zinc-600"
              />
            </div>
          </div>

          {/* 하단 row 표시용 (편집 X) */}
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
            <span>👁</span>
            <MessageSquare aria-hidden className="size-4" />
          </div>
        </div>
      </div>

      {/* 액션 */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!cur.dirty || saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {cur.isOverride && (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            기본값 복귀
          </button>
        )}
      </div>
    </div>
  );
}
