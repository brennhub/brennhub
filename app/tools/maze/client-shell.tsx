"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "@/lib/i18n/provider";
import { TILE, type MazeProject, type TileType } from "@/lib/maze/types";
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
import { ShareControls } from "@/components/maze/share-controls";
import { PlayMode } from "@/components/maze/play-mode";
import {
  clampCellPx,
  clampPan,
  fitView,
  zoomAtCursor,
  zoomLimits,
  ZOOM_REFERENCE_SIZE,
  type ViewState,
} from "@/lib/maze/viewport";

/** [16, max(W,H)] 안으로 clamp. 사이즈 변경 시 stale 저장값 정렬에 사용. */
function clampPlayViewSpan(n: number, width: number, height: number): number {
  const lo = ZOOM_REFERENCE_SIZE;
  const hi = Math.max(width, height, ZOOM_REFERENCE_SIZE);
  return Math.min(hi, Math.max(lo, n));
}

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
 * 0.14.0 (P4a): `?id=XXX` 진입 시 server component(page.tsx)가 sharedProject prop
 * 전달. shared 모드면:
 *   - localStorage hydrate skip (자신의 드래프트 영향 0)
 *   - persist skip (공유 미로를 자기 localStorage에 덮어쓰지 않음)
 *   - StepNav 숨김 (만들기↔플레이 토글 의미 X)
 *   - step=2 강제 (PlayMode 직행)
 *   - WinDialog "편집으로 돌아가기" → "내 미로 만들기" (/tools/maze navigate, id 제거)
 *
 * 이전 3-step 흐름의 "Step1→Step2 진입 시 grid build" / "Step2→Step1 reset 다이얼로그"는
 * 사라지고, hydrate 시 빈 grid면 자동 채움 + 사이즈 변경 시 확인 다이얼로그로 흐름 통합.
 */
type Props = {
  /** P4a 0.14.0: ?id= 진입 시 server-side D1 fetch 결과. 있으면 read-only play 모드. */
  sharedProject?: MazeProject;
};

export function MazeClientShell({ sharedProject }: Props = {}) {
  const t = useMessages();
  const tm = t.maze;
  const router = useRouter();
  const isShared = sharedProject !== undefined;

  const [project, setProject] = useState<MazeProject>(
    () => sharedProject ?? newProject(),
  );
  // shared 모드면 hydrate 즉시 완료 (localStorage 무시).
  const [hydrated, setHydrated] = useState(isShared);
  // shared면 PlayMode 직행 (step=2).
  const [step, setStep] = useState<Step>(isShared ? 2 : 1);
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  // P3c-1: 그리드 초기화 모달.
  const [resetGridOpen, setResetGridOpen] = useState(false);
  // P3d: 사이즈 변경 확인 다이얼로그 — 비어있지 않은 그리드에서만 사용.
  // P3d 사이즈 변경 확인 다이얼로그 + 0.10.0 직사각 일반화 — width/height 분리.
  const [pendingDims, setPendingDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [history, setHistory] = useState<GridHistory>(EMPTY_HISTORY);
  const [pathMarks, setPathMarks] = useState<ReadonlySet<string>>(EMPTY_MARKS);
  const strokeFillRef = useRef<TileType | null>(null);
  const pathStrokeModeRef = useRef<PathStrokeMode | null>(null);
  // P3e-1: 줌·팬 transient view 상태. localStorage 미저장 (schemaVersion 영향 0).
  // shared 모드면 sharedProject 차원으로 fit, 일반 모드면 newProject 차원(hydrate에서 갱신).
  const [view, setView] = useState<ViewState>(() => {
    const p = sharedProject ?? newProject();
    return fitView(p.width, p.height, CANVAS_DISPLAY_PX);
  });
  // P3e-1: 손도구 모드 — 활성 시 1포인터/마우스도 팬.
  const [handMode, setHandMode] = useState(false);

  // hydrate — 빈 grid면 emptyGrid로 자동 채움. 새 만들기 워크플로 시작 가능.
  // shared 모드(?id 진입)는 localStorage 무시 — 자신의 드래프트 보존.
  useEffect(() => {
    if (isShared) return;
    const loaded = loadProject();
    setProject(
      loaded.grid.length === 0
        ? { ...loaded, grid: emptyGrid(loaded.width, loaded.height) }
        : loaded,
    );
    setView(fitView(loaded.width, loaded.height, CANVAS_DISPLAY_PX));
    setHydrated(true);
  }, [isShared]);

  // persist — hydrate 이후 변경분만 저장 (pathMarks는 transient라 미저장).
  // shared 모드는 persist skip — 공유 미로를 자기 localStorage에 덮어쓰지 않음.
  useEffect(() => {
    if (!hydrated || isShared) return;
    saveProject(project);
  }, [project, hydrated, isShared]);

  // 그리드가 "비어있는지" 판정 — 빈 배열 또는 모든 셀 EMPTY. 사이즈 변경 모달 분기에 사용.
  const isGridEmpty = useCallback((grid: TileType[][]): boolean => {
    if (grid.length === 0) return true;
    return grid.every((row) => row.every((v) => v === TILE.EMPTY));
  }, []);

  // 사이즈 변경 클릭 — 비어있으면 즉시, 아니면 확인 다이얼로그.
  // 0.10.0 직사각 일반화 — width/height 양 차원 받음. history·marks·view 모두 새로.
  // 0.12.0: playViewSpan도 새 [16, max(W,H)]로 clamp해 stale 저장값 차단
  //   (예: 64→32 축소 후 playViewSpan=50이 max=32 초과한 채 남는 일 방지).
  //   "축소→확대 시 N 복원" nicety는 포기 — 일관성이 더 중요.
  const applySizeChange = useCallback((width: number, height: number) => {
    setProject((p) => ({
      ...p,
      width,
      height,
      grid: emptyGrid(width, height),
      playViewSpan: clampPlayViewSpan(p.playViewSpan, width, height),
    }));
    setHistory(EMPTY_HISTORY);
    setPathMarks(EMPTY_MARKS);
    setView(fitView(width, height, CANVAS_DISPLAY_PX));
  }, []);

  const handleDimsChange = useCallback(
    (width: number, height: number) => {
      if (width === project.width && height === project.height) return;
      if (isGridEmpty(project.grid)) {
        applySizeChange(width, height);
        return;
      }
      setPendingDims({ width, height });
    },
    [project.width, project.height, project.grid, isGridEmpty, applySizeChange],
  );

  const handleConfirmSizeChange = useCallback(() => {
    if (pendingDims !== null) applySizeChange(pendingDims.width, pendingDims.height);
    setPendingDims(null);
  }, [pendingDims, applySizeChange]);

  const handleFogToggle = useCallback((on: boolean) => {
    setProject((p) => ({ ...p, fogOfWar: on }));
  }, []);

  const handleFogRadiusChange = useCallback((radius: number) => {
    setProject((p) => ({ ...p, fogRadius: radius }));
  }, []);

  // 플레이 시야 거리 (P3e-2 0.12.0) — grid 영향 0이라 즉시 적용. settings-panel이
  // 이미 NumberStepper에서 [16, max(W,H)] clamp하지만 방어로 한 번 더.
  const handlePlayViewSpanChange = useCallback((n: number) => {
    setProject((p) => ({
      ...p,
      playViewSpan: clampPlayViewSpan(n, p.width, p.height),
    }));
  }, []);

  // 제한 시간 (P5a 1.1.0) — grid 영향 0이라 즉시 적용. null=타이머 없음.
  // settings-panel이 이미 NumberStepper에서 [MIN, MAX] clamp하지만 방어 X
  // (이 콜백은 toggle on/off 또는 stepper 값 변경 두 경로만, 둘 다 검증된 값).
  const handleTimeLimitChange = useCallback((n: number | null) => {
    setProject((p) => ({ ...p, timeLimitSec: n }));
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
      return { ...p, grid: emptyGrid(p.width, p.height) };
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
      const grid: TileType[][] = Array.from({ length: p.height }, (_, r) =>
        Array.from({ length: p.width }, (_, c) => {
          const cur = p.grid[r][c];
          if (cur === TILE.START || cur === TILE.GOAL) return cur;
          return pathMarks.has(`${r},${c}`) ? TILE.EMPTY : TILE.WALL;
        }),
      );
      return { ...p, grid };
    });
    setPathMarks(EMPTY_MARKS);
  }, [pathMarks]);

  // 줌 컨트롤 (P3e-1, 0.10.0 width/height 일반화) — 버튼은 캔버스 중앙 기준 줌.
  const handleZoomIn = useCallback(() => {
    const newCellPx = clampCellPx(
      view.cellPx * ZOOM_BUTTON_FACTOR,
      project.width,
      project.height,
      CANVAS_DISPLAY_PX,
    );
    if (newCellPx === view.cellPx) return;
    setView(
      zoomAtCursor(
        view,
        CANVAS_DISPLAY_PX / 2,
        CANVAS_DISPLAY_PX / 2,
        newCellPx,
        project.width,
        project.height,
        CANVAS_DISPLAY_PX,
      ),
    );
  }, [view, project.width, project.height]);

  const handleZoomOut = useCallback(() => {
    const newCellPx = clampCellPx(
      view.cellPx / ZOOM_BUTTON_FACTOR,
      project.width,
      project.height,
      CANVAS_DISPLAY_PX,
    );
    if (newCellPx === view.cellPx) return;
    setView(
      zoomAtCursor(
        view,
        CANVAS_DISPLAY_PX / 2,
        CANVAS_DISPLAY_PX / 2,
        newCellPx,
        project.width,
        project.height,
        CANVAS_DISPLAY_PX,
      ),
    );
  }, [view, project.width, project.height]);

  const handleFit = useCallback(() => {
    setView(fitView(project.width, project.height, CANVAS_DISPLAY_PX));
  }, [project.width, project.height]);

  // view 변경 외부 핸들러 — maze-grid가 휠/핀치/팬으로 view를 갱신할 때 호출.
  const handleViewChange = useCallback(
    (next: ViewState) => {
      const cellPx = clampCellPx(
        next.cellPx,
        project.width,
        project.height,
        CANVAS_DISPLAY_PX,
      );
      const { panX, panY } = clampPan(
        next.panX,
        next.panY,
        cellPx,
        project.width,
        project.height,
        CANVAS_DISPLAY_PX,
      );
      setView({ cellPx, panX, panY });
    },
    [project.width, project.height],
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

      {/* shared 모드는 StepNav 숨김 — 만들기 ↔ 플레이 토글 의미 X (read-only play). */}
      {!isShared && (
        <StepNav
          step={step}
          labels={[tm.step1, tm.step2]}
          onStep={handleStepNav}
          disabledSteps={validation.ok ? undefined : [2]}
        />
      )}

      <div className="mt-6">
        {step === 1 && (
          // 만들기 — 통합 화면. 그리드 위는 고정 높이만(설정·팔레트·컨트롤),
          // 가변/contextual은 그리드 아래(PathCommitButton·ValidationPanel).
          <div className="space-y-4">
            <SettingsPanel
              width={project.width}
              height={project.height}
              fogOfWar={project.fogOfWar}
              fogRadius={project.fogRadius}
              playViewSpan={project.playViewSpan}
              onPlayViewSpanChange={handlePlayViewSpanChange}
              timeLimitSec={project.timeLimitSec}
              onTimeLimitChange={handleTimeLimitChange}
              onSizeChange={handleDimsChange}
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
            {/* 캔버스 + ZoomControls (0.10.1) — flex row 배치, 컨트롤은 캔버스 외부 우측.
                줌 컨트롤이 셀 그리기를 가리던 0.9.0 문제 해소.
                줌 불가 맵(max(w,h) ≤ ZOOM_REFERENCE_SIZE)은 컨트롤 자체 미렌더. */}
            <div className="flex flex-wrap items-start justify-center gap-2">
              <div className="w-full max-w-[512px]">
                <MazeGrid
                  grid={project.grid}
                  width={project.width}
                  height={project.height}
                  theme={project.theme}
                  pathMarks={pathMarks}
                  view={view}
                  onViewChange={handleViewChange}
                  handMode={handMode}
                  onPaint={handlePaint}
                />
              </div>
              {Math.max(project.width, project.height) > ZOOM_REFERENCE_SIZE && (
                <ZoomControls
                  cellPx={view.cellPx}
                  minCellPx={
                    zoomLimits(project.width, project.height, CANVAS_DISPLAY_PX).min
                  }
                  maxCellPx={
                    zoomLimits(project.width, project.height, CANVAS_DISPLAY_PX).max
                  }
                  handMode={handMode}
                  onToggleHand={() => setHandMode((v) => !v)}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onFit={handleFit}
                />
              )}
            </div>
            <PathCommitButton
              visible={activeTool === "path" && pathMarks.size > 0}
              onCommit={handleCommitWalls}
            />
            <ValidationPanel result={validation} score={score} />
            {/* 공유 링크 생성 (P4a 0.14.0) — validation.ok 시만 노출. */}
            <ShareControls visible={validation.ok} project={project} />
          </div>
        )}
        {step === 2 && (
          <PlayMode
            project={project}
            // shared 모드: WinDialog "내 미로 만들기" → /tools/maze navigate(id 제거).
            // 일반 모드: setStep(1) 만들기 복귀.
            onBackToEdit={
              isShared ? () => router.push("/tools/maze") : () => setStep(1)
            }
            backLabel={isShared ? tm.sharedBuildOwn : undefined}
          />
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
        open={pendingDims !== null}
        title={tm.sizeChangeTitle}
        message={tm.sizeChangeMessage}
        confirmLabel={tm.sizeChangeConfirm}
        onConfirm={handleConfirmSizeChange}
        onCancel={() => setPendingDims(null)}
      />
    </main>
  );
}
