"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
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
 * 입력 화면.
 *
 * 저장에 성공하면 곧바로 열람 화면으로 넘어간다 — 링크는 거기서 복사한다.
 * 저장 직후에만 보이는 링크 패널을 따로 두면 "그 화면을 닫으면 주소를 잃는다"는
 * 불안이 생긴다. 열람 화면은 언제든 다시 열 수 있는 자리다.
 */

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function RecipeNoteClientShell() {
  const t = useMessages().recipeNote;
  const router = useRouter();
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

      rememberMyRecipe({
        key: data.key,
        title: input.title.slice(0, LIMITS.titleMax),
        editToken: data.editToken,
        savedAt: Date.now(),
      });
      // saving 상태를 유지한 채 넘어간다 — 버튼이 잠겨 있어야 중복 저장이 없다.
      router.push(`/tools/recipe-note/r/${data.key}`);
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

      {hydrated && mine.length > 0 && (
        <MyRecipeList
          entries={mine}
          onRemove={(key) => setMine(forgetMyRecipe(key))}
        />
      )}
    </main>
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
