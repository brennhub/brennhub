"use client";

import { useMemo, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { findQtyCandidates, parseManualSpan } from "@/lib/recipe-note/parse";
import type { Ingredient, QtySelection } from "@/lib/recipe-note/types";

/**
 * 재료 한 줄의 수량 확정 UI.
 *
 * 자동 후보는 단위 사전에 있는 것만 뜬다. 사전 밖 표현("500 그램", "2공기")과
 * 단위 없는 수량("3")은 **직접 고르기**로 잡는다 — 어절을 눌러 구간을 지정하므로
 * 타이핑이 없고 오프셋이 절대 어긋나지 않는다.
 */

const SAME = (a: QtySelection | null, b: QtySelection | null) =>
  a === b || (!!a && !!b && a.start === b.start && a.end === b.end);

const NONE_VALUE = "none";
/** 이미 수동 지정된 구간을 그대로 보여주는 옵션 (선택 유지용). */
const MANUAL_CURRENT = "manual-current";
/** 어절 고르기 패널을 여는 옵션 — 수동 지정 중에도 다시 고를 수 있어야 한다. */
const MANUAL_OPEN = "manual-open";

type Word = { text: string; start: number; end: number };

/** 원문을 어절로 쪼개되 각 어절의 오프셋을 그대로 들고 있는다. */
function splitWords(text: string): Word[] {
  const words: Word[] = [];
  const re = /\S+/g;
  for (const m of text.matchAll(re)) {
    if (m.index === undefined) continue;
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

export function QtyPicker({
  ingredient,
  onChange,
}: {
  ingredient: Ingredient;
  onChange: (sel: QtySelection | null) => void;
}) {
  const t = useMessages().recipeNote;
  const { text, sel } = ingredient;

  const candidates = useMemo(() => findQtyCandidates(text), [text]);
  const words = useMemo(() => splitWords(text), [text]);

  const [manualOpen, setManualOpen] = useState(false);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);

  const matchedIndex = candidates.findIndex((c) => SAME(c, sel));
  // 후보에 없는데 sel이 있으면 수동 지정된 줄이다.
  const isManualSel = sel !== null && matchedIndex === -1;

  const range =
    anchor === null || focus === null
      ? null
      : { from: Math.min(anchor, focus), to: Math.max(anchor, focus) };

  const draft = range
    ? parseManualSpan(text, words[range.from].start, words[range.to].end)
    : null;

  function selectValue(value: string) {
    if (value === MANUAL_OPEN) {
      setManualOpen(true);
      setAnchor(null);
      setFocus(null);
      return;
    }
    if (value === MANUAL_CURRENT) return;
    setManualOpen(false);
    onChange(value === NONE_VALUE ? null : (candidates[Number(value)] ?? null));
  }

  function tapWord(index: number) {
    // 첫 탭은 시작점, 두 번째 탭은 끝점. 셋째 탭부터 다시 시작점.
    if (anchor === null || focus !== null) {
      setAnchor(index);
      setFocus(null);
      return;
    }
    setFocus(index);
  }

  const selectValueNow = isManualSel
    ? MANUAL_CURRENT
    : matchedIndex >= 0
      ? String(matchedIndex)
      : NONE_VALUE;

  return (
    <div className="shrink-0">
      <select
        value={manualOpen ? MANUAL_OPEN : selectValueNow}
        onChange={(e) => selectValue(e.target.value)}
        aria-label={t.qtyLabel}
        className="max-w-[10rem] rounded-md border border-input bg-transparent px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
      >
        <option value={NONE_VALUE}>{t.qtyNone}</option>
        {candidates.map((c, i) => (
          <option key={`${c.start}-${c.end}`} value={String(i)}>
            {text.slice(c.start, c.end)}
          </option>
        ))}
        {isManualSel && (
          <option value={MANUAL_CURRENT}>{text.slice(sel.start, sel.end)}</option>
        )}
        <option value={MANUAL_OPEN}>{t.qtyManual}</option>
      </select>

      {manualOpen && (
        <div className="mt-2 rounded-md border border-border bg-card p-2">
          <p className="mb-2 text-xs text-muted-foreground">{t.qtyManualHelp}</p>
          <div className="flex flex-wrap gap-1">
            {words.map((w, i) => {
              const inRange = range !== null && i >= range.from && i <= range.to;
              const isAnchor = anchor === i && focus === null;
              return (
                <button
                  key={`${w.start}-${i}`}
                  type="button"
                  onClick={() => tapWord(i)}
                  className={`rounded px-1.5 py-1 text-xs transition-colors ${
                    inRange || isAnchor
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70"
                  }`}
                >
                  {w.text}
                </button>
              );
            })}
          </div>

          {range !== null && !draft && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">
              {t.qtyManualInvalid}
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!draft}
              onClick={() => {
                if (!draft) return;
                onChange(draft);
                setManualOpen(false);
              }}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.qtyManualConfirm}
            </button>
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t.qtyManualCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
