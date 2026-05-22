"use client";

import { Trash2 } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Glyph } from "@/lib/language-maker/types";
import { GlyphCanvas } from "./glyph-canvas";

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground transition-colors hover:border-ring/60 focus:border-ring focus:outline-none placeholder:text-muted-foreground";

type Props = {
  glyph: Glyph;
  index: number;
  duplicate: boolean;
  dragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTriggerChange: (trigger: string) => void;
  onPreviewPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPreviewPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPreviewPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPreviewPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
};

/** 문자 카드 — 미리보기(클릭=에디터 / 드래그=재정렬) + 트리거 입력 + 삭제. */
export function CharacterCard({
  glyph,
  index,
  duplicate,
  dragging,
  onEdit,
  onDelete,
  onTriggerChange,
  onPreviewPointerDown,
  onPreviewPointerMove,
  onPreviewPointerUp,
  onPreviewPointerCancel,
}: Props) {
  const t = useMessages().languageMaker;
  const indexLabel = t.characterIndex.replace("{n}", String(index + 1));

  return (
    <div
      data-glyph-id={glyph.id}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border bg-background p-2.5 transition-all duration-150",
        dragging
          ? "z-10 scale-[1.04] border-primary shadow-xl"
          : "border-border",
      )}
    >
      {/* 미리보기 — 클릭: 에디터 열기 / 드래그: 순서 변경 */}
      <div
        role="button"
        tabIndex={0}
        aria-label={indexLabel}
        onPointerDown={onPreviewPointerDown}
        onPointerMove={onPreviewPointerMove}
        onPointerUp={onPreviewPointerUp}
        onPointerCancel={onPreviewPointerCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit();
          }
        }}
        className="flex cursor-grab touch-auto items-center justify-center rounded-md border border-border bg-card p-1.5 transition-colors select-none hover:border-ring/60 focus:border-ring focus:outline-none active:cursor-grabbing"
      >
        <GlyphCanvas bitmap={glyph.bitmap} px={72} />
      </div>

      <input
        type="text"
        value={glyph.trigger}
        onChange={(e) => onTriggerChange(e.target.value)}
        placeholder={t.triggerPlaceholder}
        maxLength={32}
        spellCheck={false}
        aria-label={`${indexLabel} — ${t.triggerPlaceholder}`}
        className={INPUT_CLASS}
      />
      {duplicate && (
        <p className="text-xs text-destructive">{t.duplicateTrigger}</p>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={t.deleteCharacter}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-card/80 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
