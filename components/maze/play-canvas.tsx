"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { MazeTheme, TileType } from "@/lib/maze/types";
import type { Pos } from "@/lib/maze/play";
import { selectEngine } from "@/lib/maze/render";

/** canvas 한 변 논리 픽셀 — maze-grid와 일치. */
const DISPLAY_PX = 512;

type Props = {
  grid: TileType[][];
  /** 그리드 가로 칸 수 (0.10.0 직사각 일반화). */
  width: number;
  /** 그리드 세로 칸 수. */
  height: number;
  theme: MazeTheme;
  player: Pos;
  fogOfWar: boolean;
  /** fogOfWar=true일 때 가시 반경 (칸). 원형(유클리드 거리). */
  fogRadius: number;
};

/**
 * Step3 플레이 캔버스 — 읽기 전용 렌더(포인터 입력 없음, 이동은 controls 측).
 *
 * Phase A(0.10.0): width/height props 분리 + cell = min(displayPx/width, displayPx/height)
 * fit 기준. 정사각이면 둘 다 같아 동작 무변화. 직사각 카메라 적용은 P3e-2에서.
 *
 * fog ON: 검정 배경 전체 → 픽셀 단위 원형 ctx.clip() → 그 안에 전체 렌더.
 * fog OFF: clearBackground → 셀별 renderTile → renderPlayer → 전체 grid lines.
 */
export function PlayCanvas({
  grid,
  width,
  height,
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(DISPLAY_PX * dpr);
    canvas.height = Math.round(DISPLAY_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = Math.min(DISPLAY_PX / width, DISPLAY_PX / height);
    const dark = colorMode === "dark";
    const engine = selectEngine(mazeTheme, dark);

    let cancelled = false;
    const draw = async () => {
      if (engine.ready) await engine.ready();
      if (cancelled) return;

      const renderAll = () => {
        engine.clearBackground(ctx, DISPLAY_PX);
        for (let r = 0; r < height; r += 1) {
          const row = grid[r];
          if (!row) continue;
          for (let c = 0; c < width; c += 1) {
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
        // P3e-1 호환 — 카메라 미도입(panX=panY=0). P3e-2에서 cameraFollow 적용.
        engine.drawGridLines(ctx, 0, 0, cell, width, height);
      };

      if (fogOfWar) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, DISPLAY_PX, DISPLAY_PX);
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
  }, [grid, width, height, mazeTheme, colorMode, player, fogOfWar, fogRadius]);

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
