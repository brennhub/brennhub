"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { errorMessageFor, localValidationCode } from "@/lib/recipe-note/errors";
import { LIMITS, type RecipeInput } from "@/lib/recipe-note/types";
import {
  forgetMyRecipe,
  loadMyRecipes,
  rememberMyRecipe,
  type MyRecipe,
} from "@/lib/recipe-note/storage";
import { EMPTY_FORM, RecipeForm } from "./components/recipe-form";

/**
 * 입력 화면 (기획서 §2-1).
 *
 * 저장 성공 시 숏링크를 화면에 남긴 뒤 열람으로 넘어간다 — 링크를 보여주지도
 * 않고 바로 이동하면 "폰으로 보낼 주소"를 다시 찾아야 한다.
 */

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; key: string; url: string }
  | { kind: "error"; message: string };

function recipeUrl(key: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/tools/recipe-note/r/${key}`;
}

export function RecipeNoteClientShell() {
  const t = useMessages().recipeNote;
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [mine, setMine] = useState<MyRecipe[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMine(loadMyRecipes());
    setHydrated(true);
  }, []);

  async function handleSubmit(input: RecipeInput) {
    const localCode = localValidationCode(input);
    if (localCode) {
      setState({ kind: "error", message: errorMessageFor(localCode, t) });
      return;
    }

    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/recipe-note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        key?: string;
        editToken?: string;
        code?: string;
      } | null;

      if (!res.ok || !data?.ok || !data.key || !data.editToken) {
        setState({ kind: "error", message: errorMessageFor(data?.code, t) });
        return;
      }

      setMine(
        rememberMyRecipe({
          key: data.key,
          title: input.title.slice(0, LIMITS.titleMax),
          editToken: data.editToken,
          savedAt: Date.now(),
        }),
      );
      setState({ kind: "saved", key: data.key, url: recipeUrl(data.key) });
    } catch {
      setState({ kind: "error", message: t.errorGeneric });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{t.description}</p>
      </header>

      {state.kind === "saved" ? (
        <SavedPanel
          url={state.url}
          recipeKey={state.key}
          onReset={() => setState({ kind: "idle" })}
        />
      ) : (
        <div className="mt-8">
          <RecipeForm
            initial={EMPTY_FORM}
            submitLabel={t.save}
            submittingLabel={t.saving}
            submitting={state.kind === "saving"}
            errorMessage={state.kind === "error" ? state.message : null}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {hydrated && mine.length > 0 && (
        <MyRecipeList
          entries={mine}
          onRemove={(key) => setMine(forgetMyRecipe(key))}
        />
      )}
    </main>
  );
}

function SavedPanel({
  url,
  recipeKey,
  onReset,
}: {
  url: string;
  recipeKey: string;
  onReset: () => void;
}) {
  const t = useMessages().recipeNote;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 거부 — 아래 입력창에서 직접 복사할 수 있다.
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {t.savedTitle}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.savedNote}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={t.copyLink}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none dark:bg-input/30"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t.copied : t.copyLink}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/tools/recipe-note/r/${recipeKey}`}
          className="inline-flex rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t.openRecipe}
        </Link>
        {/* 저장 후 빈 폼으로 돌아갈 길이 없으면 새로고침 말고는 방법이 없다. */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex rounded-lg border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted"
        >
          {t.newRecipe}
        </button>
      </div>
    </section>
  );
}

function MyRecipeList({
  entries,
  onRemove,
}: {
  entries: MyRecipe[];
  onRemove: (key: string) => void;
}) {
  const t = useMessages().recipeNote;

  return (
    <section className="mt-12">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {t.myRecipes}
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2 px-4 py-3">
            <Link
              href={`/tools/recipe-note/r/${entry.key}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline"
            >
              {entry.title}
            </Link>
            <Link
              href={`/tools/recipe-note/edit/${entry.key}`}
              aria-label={t.editAction}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => onRemove(entry.key)}
              aria-label={t.removeAction}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t.myRecipesNote}</p>
    </section>
  );
}
