"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import type { MazeTheme, TileType } from "@/lib/maze/types";
import { selectEngine } from "@/lib/maze/render";
import {
  cellFromCanvasPx,
  clampCellPx,
  clampPan,
  zoomAtCursor,
  type ViewState,
} from "@/lib/maze/viewport";

/** canvas 한 변 논리 픽셀 크기. viewport는 viewport.ts 모듈이 displayPx로 계산. */
const DISPLAY_PX = 512;

/** 휠 한 노치당 줌 배율. ×1.1 / ÷1.1 (자연스러운 작은 step). */
const WHEEL_ZOOM_FACTOR = 1.1;

type Props = {
  grid: TileType[][];
  /** 그리드 가로 칸 수 (0.10.0 직사각 일반화). */
  width: number;
  /** 그리드 세로 칸 수. */
  height: number;
  theme: MazeTheme;
  pathMarks?: ReadonlySet<string>;
  /** 줌·팬 상태 (P3e-1) — client-shell이 소유, viewport.ts가 산술 담당. */
  view: ViewState;
  onViewChange: (view: ViewState) => void;
  /** 손도구 토글 (P3e-1) — 활성 시 1포인터/마우스도 팬, 그리기 비활성. */
  handMode: boolean;
  onPaint: (r: number, c: number, isInitial: boolean) => void;
};

/**
 * Step1(만들기) 픽셀 격자 에디터.
 *
 * 렌더: clearBackground → 셀별 renderTile → renderPathMark(있는 셀만) → drawGridLines.
 * 변환은 명시 cellPx + panX/panY로만 — ctx.scale 금지 (lineWidth 일정 유지).
 *
 * 포인터/줌/팬 (P3e-1):
 *   - 1 포인터 = 그리기 (단 handMode/spacePressed면 팬, 그리기 비활성)
 *   - 2 포인터 = 핀치줌 + 팬 (1포인터 진행 stroke는 즉시 정식 종료)
 *   - 휠 = 커서 중심 줌 (addEventListener {passive:false}로 페이지 스크롤 차단)
 *   - 스페이스 keydown/keyup = 일시 손도구 (입력 필드 focus 시 무시)
 */
export function MazeGrid({
  grid,
  width,
  height,
  theme: mazeTheme,
  pathMarks,
  view,
  onViewChange,
  handMode,
  onPaint,
}: Props) {
  const { theme: colorMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1포인터 그리기 상태.
  const drawingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);

  // 활성 포인터 추적 (멀티터치).
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );

  // 핀치 시작 시 anchor 상태 — 핀치 진행 동안 reference로 사용.
  const pinchAnchorRef = useRef<{
    initialDist: number;
    initialView: ViewState;
    centerX: number;
    centerY: number;
  } | null>(null);

  // 스페이스 일시 손도구.
  const spacePressedRef = useRef(false);

  // 변경되는 view를 최신값으로 콜백에서 읽기 위한 ref.
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const handModeRef = useRef(handMode);
  useEffect(() => {
    handModeRef.current = handMode;
  }, [handMode]);

  // client 좌표 → canvas displayPx 좌표 (rect 보정).
  const clientToCanvasPx = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const c = canvasRef.current;
      if (!c) return { x: 0, y: 0 };
      const rect = c.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) * DISPLAY_PX) / rect.width,
        y: ((clientY - rect.top) * DISPLAY_PX) / rect.height,
      };
    },
    [],
  );

  // 진행 stroke를 정식 종료 — 1→2 포인터 전환 / 스페이스 keydown / 손도구 토글 등에서 호출.
  // client-shell의 strokeFillRef·pathStrokeModeRef는 다음 stroke의 isInitial=true가
  // 덮어쓰므로 별도 신호 불필요. drawingRef·lastCellRef만 리셋해도 stroke 효과 완전 종료.
  const finalizeStroke = useCallback(() => {
    drawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  // 렌더 — view 변경 시 재실행 (의존성).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(DISPLAY_PX * dpr);
    canvas.height = Math.round(DISPLAY_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dark = colorMode === "dark";
    const engine = selectEngine(mazeTheme, dark);

    let cancelled = false;
    const draw = async () => {
      if (engine.ready) await engine.ready();
      if (cancelled) return;

      engine.clearBackground(ctx, DISPLAY_PX);
      const { cellPx, panX, panY } = view;
      // Phase B: 가시 셀 컬링 — 줌인 시 viewport 밖 셀 skip. 128×128 줌인 시
      // 16384 → 수백 셀로 절약. 줌아웃 fit이면 컬링 영역이 grid 전체와 같아 효과 0.
      const rMin = Math.max(0, Math.floor(-panY / cellPx));
      const rMax = Math.min(height, Math.ceil((DISPLAY_PX - panY) / cellPx));
      const cMin = Math.max(0, Math.floor(-panX / cellPx));
      const cMax = Math.min(width, Math.ceil((DISPLAY_PX - panX) / cellPx));
      for (let r = rMin; r < rMax; r += 1) {
        const row = grid[r];
        if (!row) continue;
        for (let c = cMin; c < cMax; c += 1) {
          engine.renderTile(ctx, row[c], engine.palette, {
            x: panX + c * cellPx,
            y: panY + r * cellPx,
            size: cellPx,
          });
        }
      }
      if (pathMarks && pathMarks.size > 0 && engine.renderPathMark) {
        for (const key of pathMarks) {
          const [rs, cs] = key.split(",");
          const r = Number(rs);
          const c = Number(cs);
          if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
          if (r < rMin || r >= rMax || c < cMin || c >= cMax) continue;
          engine.renderPathMark(ctx, engine.palette, {
            x: panX + c * cellPx,
            y: panY + r * cellPx,
            size: cellPx,
          });
        }
      }
      engine.drawGridLines(ctx, panX, panY, cellPx, width, height);
    };
    void draw();

    return () => {
      cancelled = true;
    };
  }, [grid, width, height, mazeTheme, colorMode, pathMarks, view]);

  // 휠 줌 — addEventListener with {passive:false}. React onWheel은 passive 처리될 수
  // 있어 preventDefault가 안 먹음. 페이지 스크롤 차단 위해 직접 등록.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const factor = e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      const newCellPx = clampCellPx(v.cellPx * factor, width, height, DISPLAY_PX);
      if (newCellPx === v.cellPx) return;
      const { x, y } = clientToCanvasPx(e.clientX, e.clientY);
      onViewChange(zoomAtCursor(v, x, y, newCellPx, width, height, DISPLAY_PX));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [width, height, onViewChange, clientToCanvasPx]);

  // 스페이스 keydown/keyup — 일시 손도구.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (!spacePressedRef.current) {
        spacePressedRef.current = true;
        // 스페이스 누르는 순간 진행 stroke 종료 — 손도구 전환과 동시에 그리던 게 멈추게.
        finalizeStroke();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [finalizeStroke]);

  // 손도구 토글이 ON으로 바뀌면 진행 stroke 정식 종료.
  useEffect(() => {
    if (handMode) finalizeStroke();
  }, [handMode, finalizeStroke]);

  const isPanMode = (): boolean =>
    handModeRef.current || spacePressedRef.current;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = clientToCanvasPx(e.clientX, e.clientY);
      activePointersRef.current.set(e.pointerId, { x, y });

      const count = activePointersRef.current.size;
      if (count === 1) {
        if (isPanMode()) return; // 1포인터 팬 모드 — 그리기 안 함
        const cell = cellFromCanvasPx(x, y, viewRef.current, width, height);
        if (!cell) return;
        drawingRef.current = true;
        lastCellRef.current = `${cell.r},${cell.c}`;
        onPaint(cell.r, cell.c, true);
      } else if (count === 2) {
        // 1→2 전환: 진행 stroke 정식 종료 + 핀치 anchor 잡기.
        finalizeStroke();
        const pts = Array.from(activePointersRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        pinchAnchorRef.current = {
          initialDist: dist || 1,
          initialView: viewRef.current,
          centerX: (pts[0].x + pts[1].x) / 2,
          centerY: (pts[0].y + pts[1].y) / 2,
        };
      }
      // 3+ 포인터는 무시 (멀티터치 의도 명확치 않음).
    },
    [clientToCanvasPx, width, height, onPaint, finalizeStroke],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const prev = activePointersRef.current.get(e.pointerId);
      if (!prev) return;
      const { x, y } = clientToCanvasPx(e.clientX, e.clientY);
      activePointersRef.current.set(e.pointerId, { x, y });

      const count = activePointersRef.current.size;

      if (count === 2 && pinchAnchorRef.current) {
        // 핀치줌 + 팬: anchor 기준 거리 비율로 cellPx, center 이동으로 추가 pan.
        const pts = Array.from(activePointersRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const a = pinchAnchorRef.current;
        const scale = dist / a.initialDist;
        const newCellPx = clampCellPx(
          a.initialView.cellPx * scale,
          width,
          height,
          DISPLAY_PX,
        );
        // anchor center 기준 줌
        const zoomed = zoomAtCursor(
          a.initialView,
          a.centerX,
          a.centerY,
          newCellPx,
          width,
          height,
          DISPLAY_PX,
        );
        // center 이동분만큼 추가 팬
        const dxCenter = cx - a.centerX;
        const dyCenter = cy - a.centerY;
        const clamped = clampPan(
          zoomed.panX + dxCenter,
          zoomed.panY + dyCenter,
          zoomed.cellPx,
          width,
          height,
          DISPLAY_PX,
        );
        onViewChange({
          cellPx: zoomed.cellPx,
          panX: clamped.panX,
          panY: clamped.panY,
        });
        return;
      }

      if (count === 1) {
        if (isPanMode()) {
          const dx = x - prev.x;
          const dy = y - prev.y;
          const v = viewRef.current;
          const clamped = clampPan(
            v.panX + dx,
            v.panY + dy,
            v.cellPx,
            width,
            height,
            DISPLAY_PX,
          );
          onViewChange({ cellPx: v.cellPx, panX: clamped.panX, panY: clamped.panY });
          return;
        }
        if (!drawingRef.current) return;
        const cell = cellFromCanvasPx(x, y, viewRef.current, width, height);
        if (!cell) return;
        const key = `${cell.r},${cell.c}`;
        if (key === lastCellRef.current) return;
        lastCellRef.current = key;
        onPaint(cell.r, cell.c, false);
      }
    },
    [clientToCanvasPx, width, height, onPaint, onViewChange],
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.delete(e.pointerId);
      const count = activePointersRef.current.size;
      if (count === 0) {
        finalizeStroke();
        pinchAnchorRef.current = null;
      } else if (count === 1) {
        // 2→1 전환: 핀치 종료. 남은 1포인터는 그리기로 자동 진입 X
        // (사용자가 손가락 떼는 중 — 명확한 새 stroke 시작 의도 아님).
        pinchAnchorRef.current = null;
      }
    },
    [finalizeStroke],
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        width: "100%",
        maxWidth: DISPLAY_PX,
        height: "auto",
        // 브라우저 기본 핀치줌·스크롤이 캔버스 제스처를 가로채지 못하게 차단.
        touchAction: "none",
        // 손도구 또는 스페이스 시 grab 커서 시각 피드백.
        cursor: handMode ? "grab" : "default",
      }}
      className="mx-auto block rounded-md border border-border"
    />
  );
}
