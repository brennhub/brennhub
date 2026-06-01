"use client";

import { useCallback, useEffect, useState } from "react";
import { tools } from "@/lib/tools-registry";
import { messages as i18nMessages } from "@/lib/i18n/messages";

/**
 * 도구 텍스트 admin override 편집.
 * 파일 default (lib/i18n/messages.ts) ∪ D1 (tool_overrides).
 * 빈 input 저장 = override 제거 (default 복귀).
 */

type Locale = "ko" | "en";
const LOCALES: Locale[] = ["ko", "en"];

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
  isOverride: boolean; // D1에 row 있는가 (UI source 배지)
};

type ToolState = Record<Locale, Editable>;

function fileDefault(slug: string, locale: Locale): { name: string; description: string } {
  const tools = i18nMessages[locale].tools;
  return tools[slug] ?? { name: slug, description: "" };
}

export function ToolsAdminClient() {
  const [state, setState] = useState<Record<string, ToolState>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load
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
        const overrideMap = new Map<string, OverrideRow>();
        for (const r of body.rows) overrideMap.set(`${r.tool_slug}:${r.locale}`, r);

        const next: Record<string, ToolState> = {};
        for (const tool of tools) {
          const slugState: Partial<ToolState> = {};
          for (const locale of LOCALES) {
            const ovRow = overrideMap.get(`${tool.slug}:${locale}`);
            slugState[locale] = {
              name: ovRow?.name ?? "",
              description: ovRow?.description ?? "",
              isOverride: !!ovRow,
            };
            // 빈 input + 저장 = override 제거(default 복귀). placeholder = 파일 default.
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
    (slug: string, locale: Locale, field: "name" | "description", value: string) => {
      setState((prev) => ({
        ...prev,
        [slug]: {
          ...prev[slug],
          [locale]: {
            ...prev[slug][locale],
            [field]: value,
          },
        },
      }));
    },
    [],
  );

  const save = useCallback(async (slug: string, locale: Locale) => {
    const cur = state[slug]?.[locale];
    if (!cur) return;
    const key = `${slug}:${locale}`;
    setSavingKey(key);
    try {
      const name = cur.name.trim();
      const desc = cur.description.trim();
      if (!name && !desc) {
        // 둘 다 비었으면 DELETE
        const res = await fetch(
          `/api/admin/tool-overrides/${encodeURIComponent(slug)}?locale=${locale}`,
          { method: "DELETE", credentials: "same-origin" },
        );
        if (res.ok) {
          setState((prev) => ({
            ...prev,
            [slug]: {
              ...prev[slug],
              [locale]: { name: "", description: "", isOverride: false },
            },
          }));
        }
      } else {
        const res = await fetch(
          `/api/admin/tool-overrides/${encodeURIComponent(slug)}?locale=${locale}`,
          {
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
              [locale]: { ...prev[slug][locale], isOverride: true },
            },
          }));
        }
      }
    } finally {
      setSavingKey(null);
    }
  }, [state]);

  const restore = useCallback(async (slug: string, locale: Locale) => {
    const key = `${slug}:${locale}`;
    setSavingKey(key);
    try {
      const res = await fetch(
        `/api/admin/tool-overrides/${encodeURIComponent(slug)}?locale=${locale}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          [slug]: {
            ...prev[slug],
            [locale]: { name: "", description: "", isOverride: false },
          },
        }));
      }
    } finally {
      setSavingKey(null);
    }
  }, []);

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

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          도구 표시 텍스트 편집
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          파일 기본값 ∪ 여기 입력 = 카드 표시. 비우고 저장하면 기본값 복귀.
          placeholder = 파일 default. 1회 SUBMIT = 저장.
        </p>
      </header>

      <div className="space-y-8">
        {tools.map((tool) => (
          <section
            key={tool.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="mb-3 text-base font-medium text-zinc-900 dark:text-zinc-50">
              <span className="font-semibold">{fileDefault(tool.slug, "ko").name}</span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                {tool.slug}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {LOCALES.map((loc) => {
                const def = fileDefault(tool.slug, loc);
                const cur = state[tool.slug]?.[loc];
                if (!cur) return null;
                const key = `${tool.slug}:${loc}`;
                const isSaving = savingKey === key;
                return (
                  <form
                    key={loc}
                    onSubmit={(e) => {
                      e.preventDefault();
                      save(tool.slug, loc);
                    }}
                    className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {loc.toUpperCase()}
                      </span>
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
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">이름</span>
                      <input
                        type="text"
                        value={cur.name}
                        onChange={(e) => updateField(tool.slug, loc, "name", e.target.value)}
                        placeholder={def.name}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">설명</span>
                      <textarea
                        value={cur.description}
                        onChange={(e) =>
                          updateField(tool.slug, loc, "description", e.target.value)
                        }
                        placeholder={def.description}
                        rows={3}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                      >
                        {isSaving ? "저장 중…" : "저장"}
                      </button>
                      {cur.isOverride && (
                        <button
                          type="button"
                          onClick={() => restore(tool.slug, loc)}
                          disabled={isSaving}
                          className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          기본값 복귀
                        </button>
                      )}
                    </div>
                  </form>
                );
              })}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}
