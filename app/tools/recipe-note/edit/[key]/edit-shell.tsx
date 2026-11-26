"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "@/lib/i18n/provider";
import { stepsToText } from "@/lib/recipe-note/parse";
import { findEditToken, rememberMyRecipe } from "@/lib/recipe-note/storage";
import { LIMITS, type Recipe, type RecipeInput } from "@/lib/recipe-note/types";
import { errorMessageFor, localValidationCode } from "@/lib/recipe-note/errors";
import { RecipeForm } from "../../components/recipe-form";

/**
 * 수정 화면 (기획서 §2-4).
 *
 * 권한은 이 기기의 editToken 보유 여부다. 로컬 판정은 화면 분기용이고,
 * 진짜 검증은 PUT이 한다 — 토큰 없이 저장을 시도하면 서버가 403으로 끊는다.
 */

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function RecipeEditShell({ recipe }: { recipe: Recipe }) {
  const t = useMessages().recipeNote;
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  useEffect(() => {
    setToken(findEditToken(recipe.key));
    setHydrated(true);
  }, [recipe.key]);

  async function handleSubmit(input: RecipeInput) {
    if (!token) {
      setState({ kind: "error", message: t.forbiddenBody });
      return;
    }

    const localCode = localValidationCode(input);
    if (localCode) {
      setState({ kind: "error", message: errorMessageFor(localCode, t) });
      return;
    }

    setState({ kind: "saving" });
    try {
      const res = await fetch(`/api/recipe-note/${recipe.key}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-edit-token": token,
        },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        code?: string;
      } | null;

      if (res.status === 403) {
        setState({ kind: "error", message: t.forbiddenBody });
        return;
      }
      if (!res.ok || !data?.ok) {
        setState({ kind: "error", message: errorMessageFor(data?.code, t) });
        return;
      }

      // 목록의 제목도 함께 따라가야 "내 레시피"가 옛 제목을 붙들지 않는다.
      rememberMyRecipe({
        key: recipe.key,
        title: input.title.slice(0, LIMITS.titleMax),
        editToken: token,
        savedAt: Date.now(),
      });
      // saving 상태를 유지한 채 넘어간다 — 버튼이 잠겨 있어야 중복 저장이 없다.
      router.push(`/tools/recipe-note/r/${recipe.key}`);
    } catch {
      setState({ kind: "error", message: t.errorGeneric });
    }
  }

  // hydrate 전에는 판정을 미룬다 — 소유자에게 "권한 없음"이 깜빡이지 않게.
  if (!hydrated) return <main className="min-h-[50vh]" />;

  if (!token) {
    return (
      <main className="mx-auto w-full max-w-md px-6 pt-20 pb-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.forbiddenTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{t.forbiddenBody}</p>
        <div className="mt-6">
          <Link
            href={`/tools/recipe-note/r/${recipe.key}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.openRecipe}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t.editHeading}
        </h1>
        <Link
          href={`/tools/recipe-note/r/${recipe.key}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t.openRecipe}
        </Link>
      </header>

      <div className="mt-8">
        <RecipeForm
          initial={{
            title: recipe.title,
            ingredients: recipe.ingredients,
            stepsText: stepsToText(recipe.steps),
          }}
          submitLabel={t.update}
          submittingLabel={t.updating}
          submitting={state.kind === "saving"}
          errorMessage={state.kind === "error" ? state.message : null}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
