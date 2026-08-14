"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, ExternalLink, Pencil } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { findEditToken } from "@/lib/recipe-note/storage";
import { hasScalableIngredient, scaledAmount } from "@/lib/recipe-note/scale";
import { SCALE_STEPS, type Recipe } from "@/lib/recipe-note/types";
import { CookMode } from "../../components/cook-mode";

/**
 * 열람 화면 (기획서 §2-2).
 *
 * 배율은 **확정된 수량에만** 걸린다. "약간"은 ×3에서도 "약간"이다 —
 * 세 배의 약간이 몇 그램인지 이 도구는 모르고, 모르는 것을 지어내지 않는다.
 */
export function RecipeViewShell({ recipe }: { recipe: Recipe }) {
  const t = useMessages().recipeNote;
  const [multiplier, setMultiplier] = useState<number>(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // 소유자 판정 = 이 기기에 수정 토큰이 있는가 (기획서 §2-2).
  // 서버가 아니라 로컬 판정이라 버튼 노출만 좌우한다 — 실제 권한은 PUT이 검증한다.
  useEffect(() => {
    setCanEdit(findEditToken(recipe.key) !== null);
  }, [recipe.key]);

  if (cooking) {
    return (
      <CookMode
        steps={recipe.steps}
        ingredients={recipe.ingredients}
        multiplier={multiplier}
        onExit={() => setCooking(false)}
      />
    );
  }

  const showScaleNote = multiplier !== 1 && hasScalableIngredient(recipe.ingredients);

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {recipe.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {recipe.channel && <span>{recipe.channel}</span>}
          {recipe.videoUrl && (
            <a
              href={recipe.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t.watchVideo}
            </a>
          )}
          {canEdit && (
            <Link
              href={`/tools/recipe-note/edit/${recipe.key}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Pencil className="size-3.5" />
              {t.editAction}
            </Link>
          )}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.ingredientsHeading}
        </h2>

        <div
          role="group"
          aria-label={t.scaleLabel}
          className="mt-3 flex flex-wrap gap-2"
        >
          {SCALE_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setMultiplier(step)}
              aria-pressed={multiplier === step}
              className={`tnum rounded-full px-4 py-2 text-sm ring-1 transition-colors ${
                multiplier === step
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-foreground/15 hover:bg-muted"
              }`}
            >
              ×{step}
            </button>
          ))}
        </div>

        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {recipe.ingredients.map((ing, index) => {
            const amount = scaledAmount(ing, multiplier);
            const isChecked = checked.has(index);
            return (
              <li key={`${ing.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-pressed={isChecked}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    tabIndex={-1}
                    className="pointer-events-none size-4 shrink-0 accent-primary"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      isChecked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {ing.name}
                  </span>
                  <span
                    className={`tnum shrink-0 text-sm ${
                      isChecked
                        ? "text-muted-foreground line-through"
                        : amount.scaled
                          ? "font-medium text-sky-700 dark:text-sky-300"
                          : "text-muted-foreground"
                    }`}
                  >
                    {amount.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {showScaleNote && (
          <p className="mt-2 text-xs text-muted-foreground">{t.scaleNote}</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.stepsHeading}
        </h2>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="tnum mt-0.5 shrink-0 text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground">
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <button
        type="button"
        onClick={() => setCooking(true)}
        className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
      >
        <ChefHat className="size-4" />
        {t.startCooking}
      </button>
    </main>
  );
}
