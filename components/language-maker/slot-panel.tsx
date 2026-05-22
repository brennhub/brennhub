"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import type { Glyph } from "@/lib/language-maker/types";
import { GlyphCanvas } from "./glyph-canvas";

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-ring/60 focus:border-ring focus:outline-none placeholder:text-muted-foreground";

type Props = {
  glyphs: Glyph[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onTriggerChange: (id: string, trigger: string) => void;
  onDraw: (id: string) => void;
};

/** 스텝 1 — 무지 슬롯(글리프) 추가/삭제 + 1:1 트리거 매핑. */
export function SlotPanel({
  glyphs,
  onAdd,
  onDelete,
  onTriggerChange,
  onDraw,
}: Props) {
  const t = useMessages().languageMaker;

  // 같은 트리거를 쓰는 글리프 수 — 중복 경고용.
  const triggerCounts = new Map<string, number>();
  for (const g of glyphs) {
    const key = g.trigger.trim();
    if (key) triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">
        {t.slotHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.slotIntro}</p>

      {glyphs.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.slotEmpty}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {glyphs.map((g, i) => {
            const key = g.trigger.trim();
            const duplicate =
              key.length > 0 && (triggerCounts.get(key) ?? 0) > 1;
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
              >
                <GlyphCanvas
                  bitmap={g.bitmap}
                  px={48}
                  className="shrink-0 rounded border border-border"
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`lm-trigger-${g.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t.glyphIndex.replace("{n}", String(i + 1))}
                  </label>
                  <input
                    id={`lm-trigger-${g.id}`}
                    type="text"
                    value={g.trigger}
                    onChange={(e) => onTriggerChange(g.id, e.target.value)}
                    placeholder={t.triggerPlaceholder}
                    maxLength={32}
                    spellCheck={false}
                    className={`mt-1 ${INPUT_CLASS}`}
                  />
                  {duplicate && (
                    <p className="mt-1 text-xs text-destructive">
                      {t.duplicateTrigger}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDraw(g.id)}
                >
                  {t.drawAction}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(g.id)}
                  aria-label={t.deleteGlyph}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" className="mt-5" onClick={onAdd}>
        <Plus />
        {t.addGlyph}
      </Button>
    </section>
  );
}
