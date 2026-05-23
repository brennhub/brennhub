"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type {
  MazeSize,
  MazeTheme,
  TileType,
} from "@/lib/maze/types";
import type { Pos } from "@/lib/maze/play";
import { selectEngine } from "@/lib/maze/render";

/** canvas 한 변 논리 픽셀 — maze-grid와 일치. */
const DISPLAY_PX = 512;

type Props = {
  grid: TileType[][];
  size: MazeSize;
  theme: MazeTheme;
  player: Pos;
  fogOfWar: boolean;
  /** fogOfWar=true일 때 가시 반경 (칸). 원형(유클리드 거리). */
  fogRadius: number;
};

/**
 * Step3 플레이 캔버스 — 읽기 전용 렌더(포인터 입력 없음, 이동은 controls 측).
 *
 * fog ON: 검정 배경 전체 → **픽셀 단위 원형 ctx.clip()** → 그 안에 전체 렌더.
 *   클립이 자르므로 셀별 visible 가드 / fog 전용 grid-line 루프 모두 불필요 —
 *   진짜 원형(셀 양자화 없음). 반경 = `fogRadius × cell` 픽셀, 단위 "칸" 의미 유지.
 *   P3a-2 후속 교정: 기존 셀 단위 `(r-pr)² + (c-pc)² ≤ R²` 가드가 작은 반경에서
 *   각져 보이던 문제 해소.
 * fog OFF: clearBackground → 셀별 renderTile → renderPlayer → 전체 grid lines.
 */
export function PlayCanvas({
  grid,
  size,
  theme: mazeTheme,
  player,
  fogOfWar,
  fogRadius,
}: Props) {
  const { theme: colorMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR 변환 외부 1회 설정 (RenderEngine 규약: 엔진은 setTransform 금지).
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(DISPLAY_PX * dpr);
    canvas.height = Math.round(DISPLAY_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = DISPLAY_PX / size;
    const dark = colorMode === "dark";
    const engine = selectEngine(mazeTheme, dark);

    let cancelled = false;
    const draw = async () => {
      if (engine.ready) await engine.ready();
      if (cancelled) return;

      // 전체 렌더 — fog ON 분기에서는 픽셀 단위 원형 clip이 자르므로 셀 가시성
      // 가드 없이 모든 셀을 그린다 (코드 분기 단순화).
      const renderAll = () => {
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
        engine.renderPlayer(ctx, engine.palette, {
          x: player.c * cell,
          y: player.r * cell,
          size: cell,
        });
        // P3e-1 시그니처 호환 — 카메라 미도입(panX=panY=0). 카메라는 P3e-2에서.
        engine.drawGridLines(ctx, 0, 0, cell, size);
      };

      if (fogOfWar) {
        // 1. 검정 배경 전체 (blackout).
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, DISPLAY_PX, DISPLAY_PX);
        // 2. 픽셀 단위 원형 클립 — player 셀 중심, 반경 = fogRadius칸 거리.
        //    셀 양자화 없이 진짜 원형. 단위 "칸" 의미는 기존 UX 그대로.
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          (player.c + 0.5) * cell,
          (player.r + 0.5) * cell,
          fogRadius * cell,
          0,
          Math.PI * 2,
        );
        ctx.clip();
        // 3. 클립 안에 전체 렌더 — clip이 자른다.
        renderAll();
        ctx.restore();
      } else {
        renderAll();
      }
    };
    void draw();

    return () => {
      cancelled = true;
    };
  }, [grid, size, mazeTheme, colorMode, player, fogOfWar, fogRadius]);

  return (
    <canvas
      ref={canvasRef}
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
