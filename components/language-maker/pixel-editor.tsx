"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { GRID_SIZE, type Glyph } from "@/lib/language-maker/types";
import { cloneBitmap, drawGlyph, emptyBitmap } from "@/lib/language-maker/glyph";
import { cn } from "@/lib/utils";
import { GlyphCanvas } from "./glyph-canvas";

/** 에디터 canvas 한 변 논리 픽셀 크기 (16칸 × 24px). */
const EDITOR_PX = 384;

type Props = {
  glyphs: Glyph[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBitmapChange: (
    id: string,
    update: (prev: boolean[][]) => boolean[][],
  ) => void;
  onGoToSlots: () => void;
};

/** 스텝 2 — 16×16 픽셀 에디터 + 편집 대상 글리프 선택. */
export function PixelEditor({
  glyphs,
  selectedId,
  onSelect,
  onBitmapChange,
  onGoToSlots,
}: Props) {
  const t = useMessages().languageMaker;
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = glyphs.find((g) => g.id === selectedId) ?? null;
  const bitmap = selected?.bitmap ?? null;

  // 드래그 상태 — 렌더 간 유지를 위해 ref 사용.
  const drawingRef = useRef(false);
  const paintValueRef = useRef(true);
  const lastCellRef = useRef<string | null>(null);

  // 에디터 canvas 렌더 (격자 + 채워진 픽셀).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(EDITOR_PX * dpr);
    canvas.height = Math.round(EDITOR_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = EDITOR_PX / GRID_SIZE;
    const dark = theme === "dark";

    // 배경 — 다크 배경에서도 픽셀 아트가 선명하도록 중간 톤.
    ctx.fillStyle = dark ? "#27272a" : "#fafafa";
    ctx.fillRect(0, 0, EDITOR_PX, EDITOR_PX);

    // 채워진 픽셀.
    drawGlyph(ctx, bitmap, 0, 0, cell, dark ? "#fafafa" : "#18181b");

    // 격자선.
    ctx.strokeStyle = dark ? "#3f3f46" : "#e4e4e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, EDITOR_PX);
      ctx.moveTo(0, p);
      ctx.lineTo(EDITOR_PX, p);
    }
    ctx.stroke();
  }, [bitmap, theme]);

  /** 포인터 좌표 → 셀 (row, col). */
  const cellFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): { r: number; c: number } => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clamp = (n: number) =>
        Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(n)));
      return {
        r: clamp(((e.clientY - rect.top) / rect.height) * GRID_SIZE),
        c: clamp(((e.clientX - rect.left) / rect.width) * GRID_SIZE),
      };
    },
    [],
  );

  const paintCell = useCallback(
    (r: number, c: number, value: boolean) => {
      if (!selectedId) return;
      onBitmapChange(selectedId, (prev) => {
        if (prev[r][c] === value) return prev;
        const next = cloneBitmap(prev);
        next[r][c] = value;
        return next;
      });
    },
    [selectedId, onBitmapChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!bitmap || !selectedId) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const { r, c } = cellFromEvent(e);
      // 빈 칸 클릭 → 칠하기, 채워진 칸 클릭 → 지우기.
      paintValueRef.current = !bitmap[r][c];
      drawingRef.current = true;
      lastCellRef.current = `${r},${c}`;
      paintCell(r, c, paintValueRef.current);
    },
    [bitmap, selectedId, cellFromEvent, paintCell],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const { r, c } = cellFromEvent(e);
      const key = `${r},${c}`;
      if (key === lastCellRef.current) return;
      lastCellRef.current = key;
      paintCell(r, c, paintValueRef.current);
    },
    [cellFromEvent, paintCell],
  );

  const endDrag = useCallback(() => {
    drawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    if (!selectedId) return;
    onBitmapChange(selectedId, () => emptyBitmap());
  }, [selectedId, onBitmapChange]);

  if (glyphs.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {t.editorHeading}
        </h2>
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.editorNoGlyph}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onGoToSlots}
        >
          {t.goToSlots}
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">
        {t.editorHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.editorIntro}</p>

      {/* 편집할 글리프 선택 */}
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {t.pickGlyph}
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {glyphs.map((g, i) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            aria-label={t.glyphIndex.replace("{n}", String(i + 1))}
            aria-pressed={g.id === selectedId}
            className={cn(
              "shrink-0 rounded-md border p-1 transition-colors",
              g.id === selectedId
                ? "border-primary ring-2 ring-primary/40"
                : "border-border hover:border-ring/60",
            )}
          >
            <GlyphCanvas bitmap={g.bitmap} px={44} />
          </button>
        ))}
      </div>

      {/* 에디터 canvas */}
      <div className="mt-4 flex flex-col items-start gap-3">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            width: "100%",
            maxWidth: EDITOR_PX,
            height: "auto",
            touchAction: "none",
          }}
          className="rounded-md border border-border"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          {t.clearGlyph}
        </Button>
      </div>
    </section>
  );
}
