"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { makeIngredient, parseSteps } from "@/lib/recipe-note/parse";
import {
  LIMITS,
  type Ingredient,
  type QtySelection,
  type RecipeInput,
} from "@/lib/recipe-note/types";
import { QtyPicker } from "./qty-picker";

/**
 * 입력·수정 공용 폼.
 *
 * 재료 줄은 **원문 그대로** 왼쪽에 남고, 어디까지가 양인지는 오른쪽 드롭다운으로
 * 사용자가 정한다. 파서가 틀려도 글자는 안 바뀐다.
 */

export type RecipeFormValue = {
  title: string;
  ingredients: Ingredient[];
  stepsText: string;
};

export const EMPTY_FORM: RecipeFormValue = {
  title: "",
  ingredients: [],
  stepsText: "",
};

type Props = {
  initial: RecipeFormValue;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: RecipeInput) => void;
};

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30";

const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function RecipeForm({
  initial,
  submitLabel,
  submittingLabel,
  submitting,
  errorMessage,
  onSubmit,
}: Props) {
  const t = useMessages().recipeNote;

  const [title, setTitle] = useState(initial.title);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial.ingredients,
  );
  const [draft, setDraft] = useState("");
  const [stepsText, setStepsText] = useState(initial.stepsText);

  const atIngredientLimit = ingredients.length >= LIMITS.ingredientsMax;
  const canAdd = draft.trim().length > 0 && !atIngredientLimit;

  function addIngredient() {
    const parsed = makeIngredient(draft);
    if (!parsed || atIngredientLimit) return;
    setIngredients((prev) => [...prev, parsed]);
    setDraft("");
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function setSelection(index: number, sel: QtySelection | null) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, sel } : ing)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // 입력창에 남아 있는 한 줄도 저장에 포함한다 — "추가를 안 눌러서 날아갔다"를 막는다.
    const pending = makeIngredient(draft);
    const finalIngredients =
      pending && !atIngredientLimit ? [...ingredients, pending] : ingredients;

    onSubmit({
      title: title.trim(),
      ingredients: finalIngredients,
      steps: parseSteps(stepsText),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label htmlFor="rn-title" className={LABEL_CLASS}>
          {t.titleLabel}
        </label>
        <input
          id="rn-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          maxLength={LIMITS.titleMax}
          className={`${INPUT_CLASS} mt-1.5`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.ingredientsLabel}
        </h2>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addIngredient();
            }}
            placeholder={t.ingredientPlaceholder}
            maxLength={LIMITS.textMax}
            disabled={atIngredientLimit}
            className={INPUT_CLASS}
            aria-label={t.ingredientsLabel}
          />
          <button
            type="button"
            onClick={addIngredient}
            disabled={!canAdd}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.ingredientAdd}
          </button>
        </div>

        {ingredients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {t.ingredientsEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {ingredients.map((ing, index) => (
              <li
                key={`${ing.text}-${index}`}
                className="flex items-start gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 pt-1 text-sm break-words text-foreground">
                  {ing.text}
                </span>
                <QtyPicker
                  ingredient={ing}
                  onChange={(sel) => setSelection(index, sel)}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  aria-label={t.ingredientRemove}
                  className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.stepsLabel}
        </h2>
        <textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={t.stepsPlaceholder}
          rows={10}
          className="w-full resize-y rounded-lg bg-card p-4 text-sm text-foreground ring-1 ring-foreground/15 outline-none placeholder:text-muted-foreground/60 focus:ring-foreground/35"
        />
        <p className="text-xs text-muted-foreground">{t.stepsHint}</p>
      </section>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
