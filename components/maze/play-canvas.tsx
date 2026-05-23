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
 * 렌더 3-단계는 maze-grid 패턴 재사용 — clearBackground / fog ON 시 검정 배경 →
 * 셀별 renderTile (시야 안만) → 플레이어 renderPlayer → grid lines (시야 안만).
 *
 * fog ON: blackout 영역에 grid line이 비치지 않도록 grid lines도 시야 영역 안에서만 그림.
 * fog OFF: 전체 그림 (Step2 maze-grid와 동일).
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

      // fog ON → 검정 배경(blackout). OFF → engine.clearBackground.
      if (fogOfWar) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, DISPLAY_PX, DISPLAY_PX);
      } else {
        engine.clearBackground(ctx, DISPLAY_PX);
      }

      // 시야 판정 — 유클리드 거리 ≤ fogRadius (원형 시야).
      const r2 = fogRadius * fogRadius;
      const visible = (r: number, c: number): boolean => {
        if (!fogOfWar) return true;
        const dr = r - player.r;
        const dc = c - player.c;
        return dr * dr + dc * dc <= r2;
      };

      // 타일 렌더 — 시야 안만.
      for (let r = 0; r < size; r += 1) {
        const row = grid[r];
        if (!row) continue;
        for (let c = 0; c < size; c += 1) {
          if (!visible(r, c)) continue;
          engine.renderTile(ctx, row[c], engine.palette, {
            x: c * cell,
            y: r * cell,
            size: cell,
          });
        }
      }

      // 플레이어 마커 — 항상 시야 안(자기 자신).
      engine.renderPlayer(ctx, engine.palette, {
        x: player.c * cell,
        y: player.r * cell,
        size: cell,
      });

      // 격자선 — fog ON이면 시야 안 셀별로만 stroke, OFF면 전체.
      if (fogOfWar) {
        ctx.strokeStyle = engine.palette.gridLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let r = 0; r < size; r += 1) {
          for (let c = 0; c < size; c += 1) {
            if (!visible(r, c)) continue;
            const x = Math.round(c * cell) + 0.5;
            const y = Math.round(r * cell) + 0.5;
            // 셀 사각형 4변 — 인접 셀이 그리는 변과 중복되지만 시야 경계가
            // 깔끔히 끊겨 blackout이 강조됨 (셀별 closed rect 선호).
            ctx.moveTo(x, y);
            ctx.lineTo(x + cell, y);
            ctx.lineTo(x + cell, y + cell);
            ctx.lineTo(x, y + cell);
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        engine.drawGridLines(ctx, DISPLAY_PX, size);
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
