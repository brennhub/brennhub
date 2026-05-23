/**
 * 뷰포트 변환 순수 산술 (P3e-1).
 *
 * 편집 화면(maze-grid)과 플레이 화면(play-canvas, P3e-2) 양쪽이 같은 변환 모델을
 * 공유한다. 컴포넌트가 좌표·clamp·줌 산술을 자체 보유하면 둘이 어긋날 위험 — 본
 * 모듈이 단일 출처.
 *
 * 캔버스 좌표 모델: canvas의 한 변 = `DISPLAY_PX` (논리 픽셀). 모든 함수는 픽셀 단위.
 * 셀 (r,c) → 캔버스 좌표 (x,y):
 *   x = panX + c * cellPx
 *   y = panY + r * cellPx
 *
 * **줌 한계** (Q1):
 *   - 줌아웃 = 현 그리드 fit: cellPx = DISPLAY_PX / size
 *   - 줌인  = 16맵 fit 셀 크기: cellPx = DISPLAY_PX / ZOOM_REFERENCE_SIZE
 *   - 16맵은 둘이 같아 줌 범위 0 → 컨트롤 비활성.
 */

import type { MazeSize } from "./types";

/** 줌인 한계 기준 — "16맵 한 셀이 차지하는 픽셀이 줌인 최대치." */
export const ZOOM_REFERENCE_SIZE = 16;

export type ViewState = {
  cellPx: number;
  panX: number;
  panY: number;
};

export type Pos = { r: number; c: number };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** 줌 한계 — size별 [min(=fit), max(=16맵 셀)]. */
export function zoomLimits(
  size: MazeSize,
  displayPx: number,
): { min: number; max: number } {
  return {
    min: displayPx / size,
    max: displayPx / ZOOM_REFERENCE_SIZE,
  };
}

/** fit view — 줌아웃 최대(현 그리드 전부 보임), pan 가운데. */
export function fitView(size: MazeSize, displayPx: number): ViewState {
  return { cellPx: displayPx / size, panX: 0, panY: 0 };
}

/**
 * pan 클램프 — grid가 displayPx보다 크면 [displayPx - gridPx, 0] 사이로,
 * 작거나 같으면 가운데 정렬. fit 상태(gridPx == displayPx)는 (0,0).
 */
export function clampPan(
  panX: number,
  panY: number,
  cellPx: number,
  size: number,
  displayPx: number,
): { panX: number; panY: number } {
  const gridPx = size * cellPx;
  if (gridPx <= displayPx) {
    const centered = (displayPx - gridPx) / 2;
    return { panX: centered, panY: centered };
  }
  const lo = displayPx - gridPx; // 음수
  return {
    panX: clamp(panX, lo, 0),
    panY: clamp(panY, lo, 0),
  };
}

/**
 * cellPx 변경 + pan 보정 — 사용자 명시 한계(zoomLimits) 안으로 클램프하고,
 * pan은 cursor를 고정점으로 두는 zoomAtCursor 또는 fit/리셋 등 호출자에서 결정.
 * 본 함수는 단순 clamp만.
 */
export function clampCellPx(
  cellPx: number,
  size: MazeSize,
  displayPx: number,
): number {
  const { min, max } = zoomLimits(size, displayPx);
  return clamp(cellPx, min, max);
}

/**
 * 커서 중심 줌 — 줌 전후 cursor 아래 셀 좌표가 유지되도록 pan 보정.
 *
 * 공식:
 *   worldX = (cursorX - panX) / cellPx_before  (= 줌 전 cursor의 world 좌표)
 *   panX_after = cursorX - worldX * cellPx_after
 *
 * 줌 한계는 clampCellPx로 사전 적용 후 호출 권장. pan은 마지막에 clampPan.
 */
export function zoomAtCursor(
  view: ViewState,
  cursorX: number,
  cursorY: number,
  newCellPx: number,
  size: number,
  displayPx: number,
): ViewState {
  const worldX = (cursorX - view.panX) / view.cellPx;
  const worldY = (cursorY - view.panY) / view.cellPx;
  const panXraw = cursorX - worldX * newCellPx;
  const panYraw = cursorY - worldY * newCellPx;
  const clamped = clampPan(panXraw, panYraw, newCellPx, size, displayPx);
  return { cellPx: newCellPx, panX: clamped.panX, panY: clamped.panY };
}

/**
 * 캔버스 픽셀 → 셀 좌표. 범위 밖이면 null.
 *
 * 호출자(maze-grid)는 pointer 이벤트의 client 좌표를 canvas getBoundingClientRect로
 * 변환한 뒤 (displayPx / rect.width 보정 포함) 본 함수에 displayPx 단위로 넘긴다.
 */
export function cellFromCanvasPx(
  px: number,
  py: number,
  view: ViewState,
  size: number,
): Pos | null {
  const worldX = (px - view.panX) / view.cellPx;
  const worldY = (py - view.panY) / view.cellPx;
  const c = Math.floor(worldX);
  const r = Math.floor(worldY);
  if (r < 0 || r >= size || c < 0 || c >= size) return null;
  return { r, c };
}

/**
 * 플레이어 추적 카메라 (P3e-2) — 플레이어 셀 중앙을 캔버스 중앙에 두되 가장자리는 클램프.
 *
 * grid가 displayPx보다 작거나 같으면 가운데 정렬(클램프 자체가 처리).
 * 16맵은 자연스럽게 panX=panY=0이 되어 카메라 효과 없음.
 */
export function cameraFollow(
  player: Pos,
  size: MazeSize,
  cellPx: number,
  displayPx: number,
): ViewState {
  const panXraw = displayPx / 2 - (player.c + 0.5) * cellPx;
  const panYraw = displayPx / 2 - (player.r + 0.5) * cellPx;
  const { panX, panY } = clampPan(panXraw, panYraw, cellPx, size, displayPx);
  return { cellPx, panX, panY };
}
