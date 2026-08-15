"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { LIMITS, type Ingredient, type QtySelection } from "@/lib/recipe-note/types";
import { QtyPicker } from "./qty-picker";

/**
 * 재료 한 줄 — 원문 + 선택 토글 + 수량 확정 + 브랜드/구입처.
 *
 * 한 줄에 세 가지 제스처가 겹친다: 본문 탭(선택 토글) · 드래그(순서) ·
 * 폼 컨트롤 조작. 겹침은 **배치**로 푼다:
 *
 *   - 드래그 표면은 `<li>`(부모가 itemProps를 스프레드). 넓힌 interactiveSelector가
 *     컨트롤 위에서의 pointerdown을 걸러 주므로 select/input이 정상 동작한다.
 *   - 본문은 컨트롤들의 **형제**라 컨트롤 클릭이 토글에 전파되지 않는다.
 *   - 본문을 `<button>`으로 만들면 안 된다 — interactiveSelector에 걸려 본문에서
 *     드래그가 시작되지 않는다. role="button" + tabIndex로 접근성만 맞춘다.
 */

const META_INPUT_CLASS =
  "w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30";

/** "브랜드 · 구입처" — 있는 것만. 둘 다 없으면 null. */
export function metaSummary(ing: Ingredient): string | null {
  const parts = [ing.brand, ing.store].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

type Props = {
  ingredient: Ingredient;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleOptional: () => void;
  onChangeSelection: (sel: QtySelection | null) => void;
  onChangeMeta: (patch: { brand?: string; store?: string }) => void;
  onRemove: () => void;
};

export function IngredientRow({
  ingredient,
  expanded,
  onToggleExpanded,
  onToggleOptional,
  onChangeSelection,
  onChangeMeta,
  onRemove,
}: Props) {
  const t = useMessages().recipeNote;
  const summary = metaSummary(ingredient);

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        {/* 본문 — 탭하면 선택 재료 토글. button이 아닌 이유는 위 주석 참조. */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={ingredient.optional === true}
          aria-label={t.optionalToggle}
          onClick={onToggleOptional}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            onToggleOptional();
          }}
          className="min-w-0 flex-1 cursor-pointer pt-1 text-left"
        >
          <span
            className={`text-sm break-words ${
              ingredient.optional
                ? "text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {ingredient.text}
          </span>
          {ingredient.optional && (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 align-middle text-[11px] font-medium text-muted-foreground">
              {t.optionalBadge}
            </span>
          )}
          {summary && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {summary}
            </span>
          )}
        </div>

        <QtyPicker ingredient={ingredient} onChange={onChangeSelection} />

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={t.detailsToggle}
          className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t.ingredientRemove}
          className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={ingredient.brand ?? ""}
            onChange={(e) => onChangeMeta({ brand: e.target.value })}
            placeholder={t.brandPlaceholder}
            aria-label={t.brandLabel}
            maxLength={LIMITS.metaMax}
            className={META_INPUT_CLASS}
          />
          <input
            value={ingredient.store ?? ""}
            onChange={(e) => onChangeMeta({ store: e.target.value })}
            placeholder={t.storePlaceholder}
            aria-label={t.storeLabel}
            maxLength={LIMITS.metaMax}
            className={META_INPUT_CLASS}
          />
        </div>
      )}
    </div>
  );
}
