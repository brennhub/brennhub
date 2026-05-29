/**
 * 뷰포트 변환 순수 산술 (P3e-1 + 0.10.0 직사각 일반화).
 *
 * 편집(maze-grid)·플레이(play-canvas) 양쪽 변환 모델 단일 출처.
 *
 * 셀 (r,c) → 캔버스 좌표 (x,y):
 *   x = panX + c * cellPx
 *   y = panY + r * cellPx
 *
 * **줌 한계** (직사각 일반화):
 *   - 줌아웃 = `min(displayPx/width, displayPx/height)` — 양 차원이 캔버스 안에 fit
 *   - 줌인  = `displayPx / ZOOM_REFERENCE_SIZE` (16칸 셀 크기 — 사이즈 무관 절대값)
 *   - `max(width, height) ≤ ZOOM_REFERENCE_SIZE`면 min==max → 줌 컨트롤 비활성
 *
 * **레터박스 (0.10.0)**: 비정사각·작은 그리드는 `clampPan`이 양 차원 독립적으로
 * 가운데 정렬. 캔버스 footprint(displayPx)는 고정 정사각.
 */

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

/** 줌 한계 — width×height별 [min(=fit), max(=16맵 셀)]. */
export function zoomLimits(
  width: number,
  height: number,
  displayPx: number,
): { min: number; max: number } {
  return {
    min: Math.min(displayPx / width, displayPx / height),
    max: displayPx / ZOOM_REFERENCE_SIZE,
  };
}

/** fit view — 줌아웃 최대(양 차원 캔버스 fit), pan은 clampPan이 가운데 정렬 처리. */
export function fitView(
  width: number,
  height: number,
  displayPx: number,
): ViewState {
  const cellPx = Math.min(displayPx / width, displayPx / height);
  const { panX, panY } = clampPan(0, 0, cellPx, width, height, displayPx);
  return { cellPx, panX, panY };
}

/**
 * pan 클램프 — 양 차원 독립.
 *   gridPx <= displayPx → 그 차원 가운데 정렬
 *   gridPx >  displayPx → [displayPx - gridPx, 0] 사이로 clamp
 */
export function clampPan(
  panX: number,
  panY: number,
  cellPx: number,
  width: number,
  height: number,
  displayPx: number,
): { panX: number; panY: number } {
  const gridPxX = width * cellPx;
  const gridPxY = height * cellPx;
  const outX =
    gridPxX <= displayPx
      ? (displayPx - gridPxX) / 2
      : clamp(panX, displayPx - gridPxX, 0);
  const outY =
    gridPxY <= displayPx
      ? (displayPx - gridPxY) / 2
      : clamp(panY, displayPx - gridPxY, 0);
  return { panX: outX, panY: outY };
}

/** cellPx를 zoomLimits 안으로 clamp. pan 보정은 호출자(zoomAtCursor/applySizeChange 등). */
export function clampCellPx(
  cellPx: number,
  width: number,
  height: number,
  displayPx: number,
): number {
  const { min, max } = zoomLimits(width, height, displayPx);
  return clamp(cellPx, min, max);
}

/**
 * 커서 중심 줌 — 줌 전후 cursor 아래 셀 좌표 유지.
 *
 * worldX = (cursorX - panX) / cellPx_before
 * panX_after = cursorX - worldX * cellPx_after
 *
 * 호출자는 clampCellPx로 newCellPx를 미리 한계 안으로. pan은 마지막 clampPan.
 */
export function zoomAtCursor(
  view: ViewState,
  cursorX: number,
  cursorY: number,
  newCellPx: number,
  width: number,
  height: number,
  displayPx: number,
): ViewState {
  const worldX = (cursorX - view.panX) / view.cellPx;
  const worldY = (cursorY - view.panY) / view.cellPx;
  const panXraw = cursorX - worldX * newCellPx;
  const panYraw = cursorY - worldY * newCellPx;
  const clamped = clampPan(panXraw, panYraw, newCellPx, width, height, displayPx);
  return { cellPx: newCellPx, panX: clamped.panX, panY: clamped.panY };
}

/** 캔버스 픽셀 → 셀 좌표. 범위 밖이면 null. */
export function cellFromCanvasPx(
  px: number,
  py: number,
  view: ViewState,
  width: number,
  height: number,
): Pos | null {
  const worldX = (px - view.panX) / view.cellPx;
  const worldY = (py - view.panY) / view.cellPx;
  const c = Math.floor(worldX);
  const r = Math.floor(worldY);
  if (r < 0 || r >= height || c < 0 || c >= width) return null;
  return { r, c };
}

/**
 * 플레이어 추적 카메라 (P3e-2) — 플레이어 셀 중앙을 캔버스 중앙에 두되 가장자리는 클램프.
 *
 * grid가 displayPx보다 작거나 같은 차원은 가운데 정렬(클램프 자체가 처리).
 * 작은 grid는 자연스럽게 panX/panY=중앙 정렬이 되어 카메라 효과 없음.
 */
export function cameraFollow(
  player: Pos,
  width: number,
  height: number,
  cellPx: number,
  displayPx: number,
): ViewState {
  const panXraw = displayPx / 2 - (player.c + 0.5) * cellPx;
  const panYraw = displayPx / 2 - (player.r + 0.5) * cellPx;
  const { panX, panY } = clampPan(
    panXraw,
    panYraw,
    cellPx,
    width,
    height,
    displayPx,
  );
  return { cellPx, panX, panY };
}
