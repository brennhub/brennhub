"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import {
  ingredientKind,
  parseIngredientLine,
  parseSteps,
} from "@/lib/recipe-note/parse";
import { scaledAmount } from "@/lib/recipe-note/scale";
import { LIMITS, type Ingredient, type RecipeInput } from "@/lib/recipe-note/types";

/**
 * 입력·수정 공용 폼 (기획서 §2-1, §2-4).
 *
 * 정량과 감각량을 **같은 스타일**로 그린다 — 배지도 경고도 없다.
 * "약간"은 덜 좋은 입력이 아니라 다른 종류의 입력이다.
 */

export type RecipeFormValue = {
  title: string;
  videoUrl: string;
  channel: string;
  ingredients: Ingredient[];
  stepsText: string;
};

export const EMPTY_FORM: RecipeFormValue = {
  title: "",
  videoUrl: "",
  channel: "",
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

const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

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
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl);
  const [channel, setChannel] = useState(initial.channel);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initial.ingredients);
  const [draft, setDraft] = useState("");
  const [stepsText, setStepsText] = useState(initial.stepsText);

  /** 라이브 힌트 — 입력 중인 한 줄이 어떻게 저장될지 미리 보여준다. */
  const hint = useMemo(() => {
    const parsed = parseIngredientLine(draft);
    if (!parsed) return null;
    const kind = ingredientKind(parsed);
    if (kind === "quantified") {
      return t.hintQuantified
        .replace("{name}", parsed.name)
        .replace("{amount}", scaledAmount(parsed, 1).text);
    }
    if (kind === "sensory") {
      return t.hintSensory
        .replace("{name}", parsed.name)
        .replace("{raw}", parsed.raw ?? "");
    }
    return t.hintNameOnly.replace("{name}", parsed.name);
  }, [draft, t]);

  const atIngredientLimit = ingredients.length >= LIMITS.ingredientsMax;

  function addIngredient() {
    const parsed = parseIngredientLine(draft);
    if (!parsed || atIngredientLimit) return;
    setIngredients((prev) => [...prev, parsed]);
    setDraft("");
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // 입력창에 남아 있는 한 줄도 저장에 포함한다 — "추가를 안 눌러서 날아갔다"를 막는다.
    const pending = parseIngredientLine(draft);
    const finalIngredients =
      pending && !atIngredientLimit ? [...ingredients, pending] : ingredients;

    onSubmit({
      title: title.trim(),
      videoUrl: videoUrl.trim() || null,
      channel: channel.trim() || null,
      ingredients: finalIngredients,
      steps: parseSteps(stepsText),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rn-video" className={LABEL_CLASS}>
              {t.videoUrlLabel}{" "}
              <span className="font-normal normal-case">({t.optional})</span>
            </label>
            <input
              id="rn-video"
              type="url"
              inputMode="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={t.videoUrlPlaceholder}
              maxLength={LIMITS.videoUrlMax}
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="rn-channel" className={LABEL_CLASS}>
              {t.channelLabel}{" "}
              <span className="font-normal normal-case">({t.optional})</span>
            </label>
            <input
              id="rn-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder={t.channelPlaceholder}
              maxLength={LIMITS.channelMax}
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </div>
        </div>
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
            disabled={!hint || atIngredientLimit}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.ingredientAdd}
          </button>
        </div>

        {/* 힌트 자리를 항상 차지해 입력 중 레이아웃이 튀지 않게 한다. */}
        <p className="min-h-5 text-xs text-muted-foreground">{hint}</p>

        {ingredients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {t.ingredientsEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {ingredients.map((ing, index) => (
              <li
                key={`${ing.name}-${index}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {ing.name}
                </span>
                <span className="tnum shrink-0 text-sm text-muted-foreground">
                  {scaledAmount(ing, 1).text}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  aria-label={t.ingredientRemove}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
