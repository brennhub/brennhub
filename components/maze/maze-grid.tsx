"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { TILE, type MazeSize, type TileType } from "@/lib/maze/types";

/** canvas 한 변 논리 픽셀 크기. 셀 크기 = DISPLAY_PX / size. */
const DISPLAY_PX = 512;

type Props = {
  grid: TileType[][];
  size: MazeSize;
  /** 셀 페인트 — 적용 타일은 client-shell이 활성 도구로 결정. */
  onPaint: (r: number, c: number) => void;
};

/** 타일별 색 — 테마 대응 (pixel-editor 색 패턴). */
function tileColors(dark: boolean) {
  return {
    bg: dark ? "#27272a" : "#fafafa",
    wall: dark ? "#fafafa" : "#18181b",
    start: "#16a34a", // emerald-600
    goal: "#e11d48", // rose-600
    grid: dark ? "#3f3f46" : "#e4e4e7",
  };
}

/** Step2 픽셀 격자 에디터 — pixel-editor 포인터 드로잉 패턴 재사용. */
export function MazeGrid({ grid, size, onPaint }: Props) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 드래그(그리기) 상태.
  const drawingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);

  // canvas 렌더 — 배경 + 타일 셀 + 격자선.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(DISPLAY_PX * dpr);
    canvas.height = Math.round(DISPLAY_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = DISPLAY_PX / size;
    const dark = theme === "dark";
    const col = tileColors(dark);

    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, DISPLAY_PX, DISPLAY_PX);

    for (let r = 0; r < size; r += 1) {
      const row = grid[r];
      if (!row) continue;
      for (let c = 0; c < size; c += 1) {
        const tile = row[c];
        if (tile === TILE.EMPTY) continue;
        ctx.fillStyle =
          tile === TILE.WALL
            ? col.wall
            : tile === TILE.START
              ? col.start
              : col.goal;
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }

    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= size; i += 1) {
      const p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, DISPLAY_PX);
      ctx.moveTo(0, p);
      ctx.lineTo(DISPLAY_PX, p);
    }
    ctx.stroke();
  }, [grid, size, theme]);

  const cellFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): { r: number; c: number } => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clamp = (n: number) =>
        Math.max(0, Math.min(size - 1, Math.floor(n)));
      return {
        r: clamp(((e.clientY - rect.top) / rect.height) * size),
        c: clamp(((e.clientX - rect.left) / rect.width) * size),
      };
    },
    [size],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const { r, c } = cellFromEvent(e);
      drawingRef.current = true;
      lastCellRef.current = `${r},${c}`;
      onPaint(r, c);
    },
    [cellFromEvent, onPaint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const { r, c } = cellFromEvent(e);
      const key = `${r},${c}`;
      // 같은 셀 위 연속 이동은 무시 — 셀당 페인트 1회.
      if (key === lastCellRef.current) return;
      lastCellRef.current = key;
      onPaint(r, c);
    },
    [cellFromEvent, onPaint],
  );

  const endDrag = useCallback(() => {
    drawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        width: "100%",
        maxWidth: DISPLAY_PX,
        height: "auto",
        touchAction: "none",
      }}
      className="mx-auto block rounded-md border border-border"
    />
  );
}
