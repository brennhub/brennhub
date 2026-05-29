"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { GRID_SIZE, type Glyph } from "@/lib/language-maker/types";
import { cloneBitmap, drawGlyph, emptyBitmap } from "@/lib/language-maker/glyph";

/** 에디터 canvas 한 변 논리 픽셀 크기 (16칸 × 24px). */
const EDITOR_PX = 384;

type Props = {
  /** 편집 대상 문자. null이면 모달 닫힘. */
  glyph: Glyph | null;
  onBitmapChange: (
    id: string,
    update: (prev: boolean[][]) => boolean[][],
  ) => void;
  onClose: () => void;
};

/** 픽셀 에디터 모달 — 단일 문자 16×16 드로잉. */
export function PixelEditor({ glyph, onBitmapChange, onClose }: Props) {
  const t = useMessages().languageMaker;
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const bitmap = glyph?.bitmap ?? null;
  const glyphId = glyph?.id ?? null;

  // 드래그(그리기) 상태.
  const drawingRef = useRef(false);
  const paintValueRef = useRef(true);
  const lastCellRef = useRef<string | null>(null);

  // ESC 닫기 + body scroll lock — 모달 열림 동안.
  useEffect(() => {
    if (!glyphId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [glyphId, onClose]);

  // canvas 렌더 (격자 + 채워진 픽셀).
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

    drawGlyph(ctx, bitmap, 0, 0, cell, dark ? "#fafafa" : "#18181b");

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
      if (!glyphId) return;
      onBitmapChange(glyphId, (prev) => {
        if (prev[r][c] === value) return prev;
        const next = cloneBitmap(prev);
        next[r][c] = value;
        return next;
      });
    },
    [glyphId, onBitmapChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!bitmap || !glyphId) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const { r, c } = cellFromEvent(e);
      // 빈 칸 클릭 → 칠하기, 채워진 칸 클릭 → 지우기.
      paintValueRef.current = !bitmap[r][c];
      drawingRef.current = true;
      lastCellRef.current = `${r},${c}`;
      paintCell(r, c, paintValueRef.current);
    },
    [bitmap, glyphId, cellFromEvent, paintCell],
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
    if (!glyphId) return;
    onBitmapChange(glyphId, () => emptyBitmap());
  }, [glyphId, onBitmapChange]);

  if (!glyph) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lm-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="lm-editor-title" className="text-lg font-semibold">
            {t.editorTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.editorClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="mb-3 text-sm text-muted-foreground">{t.editorIntro}</p>
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
            className="mx-auto block rounded-md border border-border"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            {t.clearCharacter}
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            {t.editorDone}
          </Button>
        </div>
      </div>
    </div>
  );
}
