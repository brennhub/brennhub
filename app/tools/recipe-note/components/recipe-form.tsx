"use client";

import { useCallback, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { useSortable } from "@/lib/ui/use-sortable";
import { makeIngredient, parseSteps } from "@/lib/recipe-note/parse";
import {
  LIMITS,
  type Ingredient,
  type QtySelection,
  type RecipeInput,
} from "@/lib/recipe-note/types";
import { IngredientRow } from "./ingredient-row";

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

/** 폼 안에서만 쓰는 행 — `uid`는 저장되지 않는다 (드래그/펼침 상태 식별용). */
type Row = { uid: string; ing: Ingredient };

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
  /**
   * 행마다 `uid`를 붙여 들고 있는다 — **저장되지 않는 클라이언트 전용 값**이다.
   * 드래그로 순서가 바뀔 때 index를 key로 쓰면 React가 행을 잘못 재사용해
   * QtyPicker의 내부 상태와 입력 포커스가 다른 재료로 옮겨 붙는다.
   */
  const [rows, setRows] = useState<Row[]>(() =>
    initial.ingredients.map((ing, i) => ({ uid: `r${i}`, ing })),
  );
  // 초기 행들이 r0..r(n-1)을 썼으므로 다음 발급은 n부터. 증가는 이벤트 핸들러에서만.
  const uidRef = useRef(initial.ingredients.length);
  const nextUid = useCallback(() => `r${(uidRef.current += 1)}`, []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [stepsText, setStepsText] = useState(initial.stepsText);

  const atIngredientLimit = rows.length >= LIMITS.ingredientsMax;
  const canAdd = draft.trim().length > 0 && !atIngredientLimit;

  const reorder = useCallback((from: number, to: number) => {
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const sortable = useSortable({
    itemCount: rows.length,
    onReorder: reorder,
    // 폼 컨트롤 위에서는 드래그를 시작하지 않는다 — 그래야 select/input의
    // 포커스·캐럿·네이티브 드롭다운이 살아난다.
    interactiveSelector: "button, input, select, textarea, label",
    longPressMs: 400,
    // long-press 전에 움직였으면 스크롤 의도 — 드래그를 포기한다.
    cancelTouchOnMovePx: 10,
    abortOnPointerCancel: true,
  });

  function addIngredient() {
    const parsed = makeIngredient(draft);
    if (!parsed || atIngredientLimit) return;
    setRows((prev) => [...prev, { uid: nextUid(), ing: parsed }]);
    setDraft("");
  }

  function removeRow(uid: string) {
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  }

  function patchRow(uid: string, patch: Partial<Ingredient>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.uid !== uid) return r;
        const ing = { ...r.ing, ...patch };
        // false는 키를 지운다 — "선택 아님"이 기본값이라 저장할 게 없다.
        if (!ing.optional) delete ing.optional;
        return { uid, ing };
      }),
    );
  }

  function toggleExpanded(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  /** 빈 문자열은 키를 지운다 — 저장 JSON에 빈 값을 남기지 않는다. */
  function setMeta(uid: string, patch: { brand?: string; store?: string }) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.uid !== uid) return r;
        const ing = { ...r.ing };
        for (const [key, value] of Object.entries(patch)) {
          const field = key as "brand" | "store";
          if (value && value.trim()) ing[field] = value;
          else delete ing[field];
        }
        return { uid, ing };
      }),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // 입력창에 남아 있는 한 줄도 저장에 포함한다 — "추가를 안 눌러서 날아갔다"를 막는다.
    const pending = makeIngredient(draft);
    const ingredients = rows.map((r) => r.ing);
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

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {t.ingredientsEmpty}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {rows.map((row, index) => (
                <li
                  key={row.uid}
                  data-sort-index={index}
                  {...sortable.itemProps(index)}
                  className={
                    sortable.isDragging(index)
                      ? "opacity-40"
                      : sortable.isOver(index)
                        ? "bg-muted/60"
                        : ""
                  }
                >
                  <IngredientRow
                    ingredient={row.ing}
                    expanded={expanded.has(row.uid)}
                    onToggleExpanded={() => toggleExpanded(row.uid)}
                    onToggleOptional={() =>
                      patchRow(row.uid, { optional: !row.ing.optional })
                    }
                    onChangeSelection={(sel: QtySelection | null) =>
                      patchRow(row.uid, { sel })
                    }
                    onChangeMeta={(patch) => setMeta(row.uid, patch)}
                    onRemove={() => removeRow(row.uid)}
                  />
                </li>
              ))}
            </ul>
            {rows.length > 1 && (
              <p className="text-xs text-muted-foreground">{t.dragHint}</p>
            )}
          </>
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
