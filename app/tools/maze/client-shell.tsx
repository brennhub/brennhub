"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { TILE, type MazeProject, type MazeSize, type TileType } from "@/lib/maze/types";
import { cloneGrid, emptyGrid, findStart, newProject } from "@/lib/maze/grid";
import { loadProject, saveProject } from "@/lib/maze/storage";
import { scoreMaze, validateMaze } from "@/lib/maze/validate";
import { StepNav, type Step } from "@/components/maze/step-nav";
import { SettingsPanel } from "@/components/maze/settings-panel";
import { ToolPalette, type Tool } from "@/components/maze/tool-palette";
import { MazeGrid } from "@/components/maze/maze-grid";
import { ResetConfirmDialog } from "@/components/maze/reset-confirm-dialog";
import { ValidationPanel } from "@/components/maze/validation-panel";
import { EditorControls } from "@/components/maze/editor-controls";
import { PathCommitButton } from "@/components/maze/path-commit-button";
import { ZoomControls } from "@/components/maze/zoom-controls";
import { PlayMode } from "@/components/maze/play-mode";
import {
  clampCellPx,
  clampPan,
  fitView,
  zoomAtCursor,
  zoomLimits,
  type ViewState,
} from "@/lib/maze/viewport";

/**
 * Undo/Redo 히스토리 깊이 상한 (P3c-1).
 *
 * 메모리: 64×64 ≈ 4096 원소 × ~8B + 배열 오버헤드 ≈ ~32KB/snapshot.
 *   100 deep ≈ 3~4MB. 무시 가능. P3c-2 확장 후 snapshot이 `{ grid, marks }` 양쪽.
 */
const HISTORY_DEPTH = 100;

type HistorySnapshot = {
  grid: TileType[][];
  marks: ReadonlySet<string>;
};

type GridHistory = {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
};

const EMPTY_HISTORY: GridHistory = { past: [], future: [] };
const EMPTY_MARKS: ReadonlySet<string> = new Set();

type PathStrokeMode = "set" | "clear";

/** maze-grid·play-canvas 캔버스 한 변 픽셀 — viewport.ts 산술 인자. */
const CANVAS_DISPLAY_PX = 512;

/** 줌 버튼 한 클릭당 배율 (휠과 동일 step). */
const ZOOM_BUTTON_FACTOR = 1.2;

/**
 * 0.8.0 (P3d): Step1·Step2 통합.
 *   step=1: 만들기 (설정 컨트롤 + 그리기 + 검증·점수, 한 화면)
 *   step=2: 플레이 (validation.ok 시에만 활성)
 *
 * 이전 3-step 흐름의 "Step1→Step2 진입 시 grid build" / "Step2→Step1 reset 다이얼로그"는
 * 사라지고, hydrate 시 빈 grid면 자동 채움 + 사이즈 변경 시 확인 다이얼로그로 흐름 통합.
 */
export function MazeClientShell() {
  const t = useMessages();
  const tm = t.maze;

  const [project, setProject] = useState<MazeProject>(() => newProject());
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  // P3c-1: 그리드 초기화 모달.
  const [resetGridOpen, setResetGridOpen] = useState(false);
  // P3d: 사이즈 변경 확인 다이얼로그 — 비어있지 않은 그리드에서만 사용.
  const [pendingSize, setPendingSize] = useState<MazeSize | null>(null);
  const [history, setHistory] = useState<GridHistory>(EMPTY_HISTORY);
  const [pathMarks, setPathMarks] = useState<ReadonlySet<string>>(EMPTY_MARKS);
  const strokeFillRef = useRef<TileType | null>(null);
  const pathStrokeModeRef = useRef<PathStrokeMode | null>(null);
  // P3e-1: 줌·팬 transient view 상태. localStorage 미저장 (schemaVersion 영향 0).
  const [view, setView] = useState<ViewState>(() =>
    fitView(newProject().size, CANVAS_DISPLAY_PX),
  );
  // P3e-1: 손도구 모드 — 활성 시 1포인터/마우스도 팬.
  const [handMode, setHandMode] = useState(false);

  // hydrate — 빈 grid면 emptyGrid로 자동 채움. 새 만들기 워크플로 시작 가능.
  // (0.8.0 P3d: 이전엔 Step1 진입 후 startButton 클릭으로 채워졌으나, 통합 화면엔 진입점 없음.)
  useEffect(() => {
    const loaded = loadProject();
    setProject(
      loaded.grid.length === 0
        ? { ...loaded, grid: emptyGrid(loaded.size) }
        : loaded,
    );
    setView(fitView(loaded.size, CANVAS_DISPLAY_PX));
    setHydrated(true);
  }, []);

  // persist — hydrate 이후 변경분만 저장 (pathMarks는 transient라 미저장).
  useEffect(() => {
    if (!hydrated) return;
    saveProject(project);
  }, [project, hydrated]);

  // 그리드가 "비어있는지" 판정 — 빈 배열 또는 모든 셀 EMPTY. 사이즈 변경 모달 분기에 사용.
  const isGridEmpty = useCallback((grid: TileType[][]): boolean => {
    if (grid.length === 0) return true;
    return grid.every((row) => row.every((v) => v === TILE.EMPTY));
  }, []);

  // 사이즈 변경 클릭 — 비어있으면 즉시, 아니면 확인 다이얼로그.
  // history·marks·view 모두 새로 — 다른 사이즈 grid 참조 stroke는 복원 불가하고
  // view는 새 사이즈의 fit으로 리셋해야 컨트롤 한계가 의미 있음.
  const applySizeChange = useCallback((size: MazeSize) => {
    setProject((p) => ({ ...p, size, grid: emptyGrid(size) }));
    setHistory(EMPTY_HISTORY);
    setPathMarks(EMPTY_MARKS);
    setView(fitView(size, CANVAS_DISPLAY_PX));
  }, []);

  const handleSizeChange = useCallback(
    (size: MazeSize) => {
      if (size === project.size) return;
      if (isGridEmpty(project.grid)) {
        applySizeChange(size);
        return;
      }
      setPendingSize(size);
    },
    [project.size, project.grid, isGridEmpty, applySizeChange],
  );

  const handleConfirmSizeChange = useCallback(() => {
    if (pendingSize !== null) applySizeChange(pendingSize);
    setPendingSize(null);
  }, [pendingSize, applySizeChange]);

  const handleFogToggle = useCallback((on: boolean) => {
    setProject((p) => ({ ...p, fogOfWar: on }));
  }, []);

  const handleFogRadiusChange = useCallback((radius: number) => {
    setProject((p) => ({ ...p, fogRadius: radius }));
  }, []);

  // StepNav 클릭 — 만들기 ↔ 플레이. 같은 step이면 no-op.
  const handleStepNav = useCallback((next: Step) => {
    setStep(next);
  }, []);

  const validation = useMemo(() => validateMaze(project.grid), [project.grid]);
  const score = useMemo(
    () => (validation.ok ? scoreMaze(project.grid) : null),
    [project.grid, validation.ok],
  );

  // archetype 임계값 보정용 콘솔 신호 (P3a-2). P4 live 전 제거.
  useEffect(() => {
    if (!score) return;
     
    console.log("[maze score]", {
      A: score.detour.norm,
      B_corridor: score.corridor.norm,
      B_texture: score.texture.norm,
      total: score.total,
      stars: score.stars,
      weakness: score.weakness,
    });
  }, [score]);

  const handlePaint = useCallback(
    (r: number, c: number, isInitial: boolean) => {
      if (activeTool === "goal" && !isInitial) return;

      if (activeTool === "path") {
        const key = `${r},${c}`;
        if (isInitial) {
          pathStrokeModeRef.current = pathMarks.has(key) ? "clear" : "set";
        }
        const mode = pathStrokeModeRef.current ?? "set";
        if (mode === "set" && pathMarks.has(key)) return;
        if (mode === "clear" && !pathMarks.has(key)) return;
        if (isInitial) {
          setHistory((h) => ({
            past: [
              ...h.past,
              { grid: project.grid, marks: pathMarks },
            ].slice(-HISTORY_DEPTH),
            future: [],
          }));
        }
        setPathMarks((prev) => {
          const next = new Set(prev);
          if (mode === "set") next.add(key);
          else next.delete(key);
          return next;
        });
        return;
      }

      setProject((p) => {
        let nextTile: TileType;
        if (activeTool === "wall") {
          if (isInitial) {
            strokeFillRef.current =
              p.grid[r][c] === TILE.WALL ? TILE.EMPTY : TILE.WALL;
          }
          nextTile = strokeFillRef.current ?? TILE.WALL;
        } else if (activeTool === "goal") {
          nextTile = p.grid[r][c] === TILE.GOAL ? TILE.EMPTY : TILE.GOAL;
        } else {
          nextTile = TILE.START;
        }

        if (activeTool === "start") {
          const prev = findStart(p.grid);
          if (prev && prev.r === r && prev.c === c) return p;
        } else if (p.grid[r][c] === nextTile) {
          return p;
        }

        if (isInitial) {
          setHistory((h) => ({
            past: [
              ...h.past,
              { grid: p.grid, marks: pathMarks },
            ].slice(-HISTORY_DEPTH),
            future: [],
          }));
        }

        const grid = cloneGrid(p.grid);
        if (activeTool === "start") {
          const prev = findStart(grid);
          if (prev) grid[prev.r][prev.c] = TILE.EMPTY;
        }
        grid[r][c] = nextTile;
        return { ...p, grid };
      });
    },
    [activeTool, pathMarks, project.grid],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      setProject((p) => {
        setHistory((hh) => ({
          past: hh.past,
          future: [...hh.future, { grid: p.grid, marks: pathMarks }].slice(
            -HISTORY_DEPTH,
          ),
        }));
        return { ...p, grid: prev.grid };
      });
      setPathMarks(prev.marks);
      return { past: newPast, future: h.future };
    });
  }, [pathMarks]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      const newFuture = h.future.slice(0, -1);
      setProject((p) => {
        setHistory((hh) => ({
          past: [...hh.past, { grid: p.grid, marks: pathMarks }].slice(
            -HISTORY_DEPTH,
          ),
          future: hh.future,
        }));
        return { ...p, grid: next.grid };
      });
      setPathMarks(next.marks);
      return { past: h.past, future: newFuture };
    });
  }, [pathMarks]);

  // 그리드 초기화 — grid empty + marks 클리어. 둘 다 history entry로.
  const handleResetGrid = useCallback(() => {
    setProject((p) => {
      if (isGridEmpty(p.grid) && pathMarks.size === 0) return p;
      setHistory((h) => ({
        past: [
          ...h.past,
          { grid: p.grid, marks: pathMarks },
        ].slice(-HISTORY_DEPTH),
        future: [],
      }));
      return { ...p, grid: emptyGrid(p.size) };
    });
    setPathMarks(EMPTY_MARKS);
    setResetGridOpen(false);
  }, [pathMarks, isGridEmpty]);

  // "벽 생성" commit — 마크 셀=EMPTY / start·goal=보존 / 그 외=WALL. 1 undo entry.
  const handleCommitWalls = useCallback(() => {
    if (pathMarks.size === 0) return;
    setProject((p) => {
      setHistory((h) => ({
        past: [
          ...h.past,
          { grid: p.grid, marks: pathMarks },
        ].slice(-HISTORY_DEPTH),
        future: [],
      }));
      const size = p.grid.length;
      const grid: TileType[][] = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => {
          const cur = p.grid[r][c];
          if (cur === TILE.START || cur === TILE.GOAL) return cur;
          return pathMarks.has(`${r},${c}`) ? TILE.EMPTY : TILE.WALL;
        }),
      );
      return { ...p, grid };
    });
    setPathMarks(EMPTY_MARKS);
  }, [pathMarks]);

  // 줌 컨트롤 (P3e-1) — 버튼은 캔버스 중앙 기준 줌(zoomAtCursor에 center 전달).
  const handleZoomIn = useCallback(() => {
    const newCellPx = clampCellPx(
      view.cellPx * ZOOM_BUTTON_FACTOR,
      project.size,
      CANVAS_DISPLAY_PX,
    );
    if (newCellPx === view.cellPx) return;
    setView(
      zoomAtCursor(
        view,
        CANVAS_DISPLAY_PX / 2,
        CANVAS_DISPLAY_PX / 2,
        newCellPx,
        project.size,
        CANVAS_DISPLAY_PX,
      ),
    );
  }, [view, project.size]);

  const handleZoomOut = useCallback(() => {
    const newCellPx = clampCellPx(
      view.cellPx / ZOOM_BUTTON_FACTOR,
      project.size,
      CANVAS_DISPLAY_PX,
    );
    if (newCellPx === view.cellPx) return;
    setView(
      zoomAtCursor(
        view,
        CANVAS_DISPLAY_PX / 2,
        CANVAS_DISPLAY_PX / 2,
        newCellPx,
        project.size,
        CANVAS_DISPLAY_PX,
      ),
    );
  }, [view, project.size]);

  const handleFit = useCallback(() => {
    setView(fitView(project.size, CANVAS_DISPLAY_PX));
  }, [project.size]);

  // view 변경 외부 핸들러 — maze-grid가 휠/핀치/팬으로 view를 갱신할 때 호출.
  // 잘못된 view(한계 밖)가 들어와도 한 번 더 clamp — 방어.
  const handleViewChange = useCallback(
    (next: ViewState) => {
      const cellPx = clampCellPx(next.cellPx, project.size, CANVAS_DISPLAY_PX);
      const { panX, panY } = clampPan(
        next.panX,
        next.panY,
        cellPx,
        project.size,
        CANVAS_DISPLAY_PX,
      );
      setView({ cellPx, panX, panY });
    },
    [project.size],
  );

  // 키보드 단축키 — 만들기 단계(step === 1) 한정.
  // 플레이 단계(step === 2)에서는 play-controls가 방향키/WASD를 별도 바인딩 — 충돌 0.
  useEffect(() => {
    if (step !== 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, undo, redo]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.toolCommon.back}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {tm.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{tm.description}</p>
      </header>

      <StepNav
        step={step}
        labels={[tm.step1, tm.step2]}
        onStep={handleStepNav}
        disabledSteps={validation.ok ? undefined : [2]}
      />

      <div className="mt-6">
        {step === 1 && (
          // 만들기 — 통합 화면. 그리드 위는 고정 높이만(설정·팔레트·컨트롤),
          // 가변/contextual은 그리드 아래(PathCommitButton·ValidationPanel).
          <div className="space-y-4">
            <SettingsPanel
              size={project.size}
              fogOfWar={project.fogOfWar}
              fogRadius={project.fogRadius}
              onSizeChange={handleSizeChange}
              onFogToggle={handleFogToggle}
              onFogRadiusChange={handleFogRadiusChange}
            />
            <ToolPalette
              activeTool={activeTool}
              onToolChange={setActiveTool}
            />
            <EditorControls
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={undo}
              onRedo={redo}
              onResetGrid={() => setResetGridOpen(true)}
            />
            {/* 캔버스 + ZoomControls 오버레이 — relative wrapper, ZoomControls는 absolute.
                그리드 위 row를 안 늘림 (P3d 모바일 우려 직결, P3e-1 핵심 결정). */}
            <div className="relative mx-auto max-w-[512px]">
              <MazeGrid
                grid={project.grid}
                size={project.size}
                theme={project.theme}
                pathMarks={pathMarks}
                view={view}
                onViewChange={handleViewChange}
                handMode={handMode}
                onPaint={handlePaint}
              />
              <ZoomControls
                cellPx={view.cellPx}
                minCellPx={zoomLimits(project.size, CANVAS_DISPLAY_PX).min}
                maxCellPx={zoomLimits(project.size, CANVAS_DISPLAY_PX).max}
                handMode={handMode}
                onToggleHand={() => setHandMode((v) => !v)}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFit={handleFit}
              />
            </div>
            <PathCommitButton
              visible={activeTool === "path" && pathMarks.size > 0}
              onCommit={handleCommitWalls}
            />
            <ValidationPanel result={validation} score={score} />
          </div>
        )}
        {step === 2 && (
          <PlayMode project={project} onBackToEdit={() => setStep(1)} />
        )}
      </div>

      {/* 그리드 초기화 모달 (P3c-1). */}
      <ResetConfirmDialog
        open={resetGridOpen}
        title={tm.resetGridTitle}
        message={tm.resetGridMessage}
        confirmLabel={tm.resetGridConfirm}
        onConfirm={handleResetGrid}
        onCancel={() => setResetGridOpen(false)}
      />
      {/* 사이즈 변경 확인 모달 (0.8.0 P3d) — 비어있지 않은 grid에서만 트리거. */}
      <ResetConfirmDialog
        open={pendingSize !== null}
        title={tm.sizeChangeTitle}
        message={tm.sizeChangeMessage}
        confirmLabel={tm.sizeChangeConfirm}
        onConfirm={handleConfirmSizeChange}
        onCancel={() => setPendingSize(null)}
      />
    </main>
  );
}
