"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { MazeSize, MazeTheme, TileType } from "@/lib/maze/types";
import { selectEngine } from "@/lib/maze/render";

/** canvas 한 변 논리 픽셀 크기. 셀 크기 = DISPLAY_PX / size. */
const DISPLAY_PX = 512;

type Props = {
  grid: TileType[][];
  size: MazeSize;
  /** MazeProject.theme — V1은 "default" 고정. V2 sprite-dungeon 분기점. */
  theme: MazeTheme;
  /**
   * 셀 페인트 — 적용 타일은 client-shell이 활성 도구로 결정.
   * `isInitial=true`는 pointerdown(클릭 시작), `false`는 pointermove(드래그 진행) —
   * client-shell이 도구별로 드래그 허용 여부를 판단(P3a-2 후속: 도착점은 클릭 1회만).
   */
  onPaint: (r: number, c: number, isInitial: boolean) => void;
};

/**
 * Step2 픽셀 격자 에디터.
 *
 * 렌더링 일체는 `selectEngine`이 반환하는 RenderEngine이 담당한다:
 *   clearBackground → 셀별 renderTile → drawGridLines.
 * 이 컴포넌트는 fillRect/stroke를 직접 호출하지 않는다 (V2 테마 교체를
 * engine 분기 한 줄로 가능하게 하기 위한 규약).
 *
 * 포인터 드로잉은 pixel-editor 패턴 재사용.
 */
export function MazeGrid({ grid, size, theme: mazeTheme, onPaint }: Props) {
  const { theme: colorMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 드래그(그리기) 상태.
  const drawingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);

  // 렌더 — engine 3-단계 오케스트레이션.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR 변환은 여기서 한 번만 설정한다. 이후 engine 메서드는 setTransform을
    // 호출하지 않기로 한 규약(RenderEngine 주석 참고) — DPR 보존.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(DISPLAY_PX * dpr);
    canvas.height = Math.round(DISPLAY_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = DISPLAY_PX / size;
    const dark = colorMode === "dark";
    const engine = selectEngine(mazeTheme, dark);

    // 비동기 ready 훅(V2 sprite-dungeon용)을 await — V1 default는 즉시.
    // cancel 가드 — props 변경/언마운트로 인한 stale 렌더 방지.
    let cancelled = false;
    const draw = async () => {
      if (engine.ready) await engine.ready();
      if (cancelled) return;

      engine.clearBackground(ctx, DISPLAY_PX);
      for (let r = 0; r < size; r += 1) {
        const row = grid[r];
        if (!row) continue;
        for (let c = 0; c < size; c += 1) {
          engine.renderTile(ctx, row[c], engine.palette, {
            x: c * cell,
            y: r * cell,
            size: cell,
          });
        }
      }
      engine.drawGridLines(ctx, DISPLAY_PX, size);
    };
    void draw();

    return () => {
      cancelled = true;
    };
  }, [grid, size, mazeTheme, colorMode]);

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
      onPaint(r, c, true);
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
      onPaint(r, c, false);
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
