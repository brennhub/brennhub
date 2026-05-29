"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { MazeTheme, TileType } from "@/lib/maze/types";
import type { Pos } from "@/lib/maze/play";
import { selectEngine } from "@/lib/maze/render";
import { cameraFollow, ZOOM_REFERENCE_SIZE } from "@/lib/maze/viewport";

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
  /** 플레이 시야 거리 (P3e-2 0.12.0) — 캔버스 한 변 보이는 칸 수. */
  playViewSpan: number;
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
  playViewSpan,
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

    // P3e-2 0.12.0: 제작자 설정 playViewSpan으로 cellPx 계산 → cameraFollow로 view.
    //   effectiveN clamp는 storage가 이미 처리하지만 방어용으로 한 번 더 — sizeChange
    //   직후 React state가 갱신되기 전 한 프레임이라도 잘못된 값이 들어올 위험 차단.
    //   N ≥ max(W,H)면 fit·정지, N < max(W,H)면 카메라 추적 (clampPan이 자동 처리).
    const maxDim = Math.max(width, height);
    const effectiveN = Math.min(
      Math.max(playViewSpan, ZOOM_REFERENCE_SIZE),
      Math.max(maxDim, ZOOM_REFERENCE_SIZE),
    );
    const cell = DISPLAY_PX / effectiveN;
    const { panX, panY } = cameraFollow(player, width, height, cell, DISPLAY_PX);

    const dark = colorMode === "dark";
    const engine = selectEngine(mazeTheme, dark);

    let cancelled = false;
    const draw = async () => {
      if (engine.ready) await engine.ready();
      if (cancelled) return;

      const renderAll = () => {
        engine.clearBackground(ctx, DISPLAY_PX);
        // P3e-2 0.12.0: 가시 셀 컬링 — 카메라로 viewport 밖 셀이 의미 가짐.
        // maze-grid Phase B와 같은 산술. 128×128 N=16에서 256 셀만 렌더 (16384 → 256).
        const rMin = Math.max(0, Math.floor(-panY / cell));
        const rMax = Math.min(height, Math.ceil((DISPLAY_PX - panY) / cell));
        const cMin = Math.max(0, Math.floor(-panX / cell));
        const cMax = Math.min(width, Math.ceil((DISPLAY_PX - panX) / cell));
        for (let r = rMin; r < rMax; r += 1) {
          const row = grid[r];
          if (!row) continue;
          for (let c = cMin; c < cMax; c += 1) {
            // 0.10.1: 플레이어 점유 셀의 타일 마커(시작점 발자국 등)는 그리지 않음.
            if (r === player.r && c === player.c) continue;
            engine.renderTile(ctx, row[c], engine.palette, {
              x: panX + c * cell,
              y: panY + r * cell,
              size: cell,
            });
          }
        }
        engine.renderPlayer(ctx, engine.palette, {
          x: panX + player.c * cell,
          y: panY + player.r * cell,
          size: cell,
        });
        // P3e-2: 카메라 변환 적용. drawGridLines에 panX/panY 전달.
        engine.drawGridLines(ctx, panX, panY, cell, width, height);
      };

      if (fogOfWar) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, DISPLAY_PX, DISPLAY_PX);
        ctx.save();
        ctx.beginPath();
        // P3e-2: clip 중심도 카메라 변환 반영. center = panX/Y + (player + 0.5) × cell.
        ctx.arc(
          panX + (player.c + 0.5) * cell,
          panY + (player.r + 0.5) * cell,
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
  }, [
    grid,
    width,
    height,
    mazeTheme,
    colorMode,
    player,
    fogOfWar,
    fogRadius,
    playViewSpan,
  ]);

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
