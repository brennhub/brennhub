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
import { PlayMode } from "@/components/maze/play-mode";

/**
 * Undo/Redo 히스토리 깊이 상한 (P3c-1).
 *
 * 메모리 정정 (1차 계산 4KB는 오해 — JS 2D number 배열은 packed byte가 아님):
 *   64×64 ≈ 4096 원소 × ~8B + 배열 오버헤드 ≈ ~32KB/snapshot.
 *   100 deep ≈ 3~4MB. 사용자 디자인 1회분으로 무시 가능 — 100 유지.
 *
 * P3c-2 확장: snapshot이 `{ grid, marks }` 양쪽 — Set은 sparse라 메모리 영향 미미.
 */
const HISTORY_DEPTH = 100;

/** History 한 단계 — grid + 길 마크 layer 동시 스냅샷 (P3c-2). */
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

/** path stroke 모드 — pointerdown 시 시작 셀 마크 여부로 결정. */
type PathStrokeMode = "set" | "clear";

export function MazeClientShell() {
  const t = useMessages();
  const tm = t.maze;

  const [project, setProject] = useState<MazeProject>(() => newProject());
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetGridOpen, setResetGridOpen] = useState(false);
  const [history, setHistory] = useState<GridHistory>(EMPTY_HISTORY);
  // P3c-2: 길 마크 transient 레이어 (grid 밖). "벽 생성"으로 grid에 commit되며 클리어.
  const [pathMarks, setPathMarks] = useState<ReadonlySet<string>>(EMPTY_MARKS);
  // P3c-1: 벽 stroke 일관성.
  const strokeFillRef = useRef<TileType | null>(null);
  // P3c-2: path stroke 일관성 — 시작 셀 마크 여부로 stroke 전체 set/clear 결정.
  const pathStrokeModeRef = useRef<PathStrokeMode | null>(null);

  // hydrate — localStorage 로드. grid가 있으면 그리기 단계로 복원.
  useEffect(() => {
    const loaded = loadProject();
    setProject(loaded);
    setStep(loaded.grid.length > 0 ? 2 : 1);
    setHydrated(true);
  }, []);

  // persist — hydrate 이후 변경분만 저장 (pathMarks는 transient라 미저장).
  useEffect(() => {
    if (!hydrated) return;
    saveProject(project);
  }, [project, hydrated]);

  const handleSizeChange = useCallback((size: MazeSize) => {
    setProject((p) => ({ ...p, size }));
  }, []);

  const handleFogToggle = useCallback((on: boolean) => {
    setProject((p) => ({ ...p, fogOfWar: on }));
  }, []);

  const handleFogRadiusChange = useCallback((radius: number) => {
    setProject((p) => ({ ...p, fogRadius: radius }));
  }, []);

  // Step1 → Step2 — 사이즈 잠금 + grid·marks·history 모두 새 컨텍스트로.
  const handleStart = useCallback(() => {
    setProject((p) => ({ ...p, grid: emptyGrid(p.size) }));
    setHistory(EMPTY_HISTORY);
    setPathMarks(EMPTY_MARKS);
    setStep(2);
  }, []);

  // StepNav 클릭 — 1↔2↔3 전이.
  const handleStepNav = useCallback(
    (next: Step) => {
      if (next === step) return;
      if (next === 1) {
        setConfirmOpen(true);
        return;
      }
      if (next === 2) {
        if (step === 1) handleStart();
        else setStep(2);
        return;
      }
      // next === 3
      setStep(3);
    },
    [step, handleStart],
  );

  // Step2/3 → Step1 확인 — 맵 전면 리셋. grid/marks/history 모두 클리어.
  const handleConfirmReset = useCallback(() => {
    setProject((p) => ({ ...p, grid: [] }));
    setHistory(EMPTY_HISTORY);
    setPathMarks(EMPTY_MARKS);
    setStep(1);
    setConfirmOpen(false);
  }, []);

  // 완결성 검증 + 점수 — pathMarks는 grid 밖이라 영향 0. 길 도구 사용 중엔
  // 현 grid 기준 표시 (마크 미반영) — commit 후 갱신. 정직한 동작.
  const validation = useMemo(() => validateMaze(project.grid), [project.grid]);
  const score = useMemo(
    () => (validation.ok ? scoreMaze(project.grid) : null),
    [project.grid, validation.ok],
  );

  // archetype 임계값 보정용 콘솔 신호 (P3a-2 1차안). P4 live 전 제거.
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

  // 셀 페인트 — 활성 도구별 분기.
  //
  //  불변 갱신 명문화 (P3c-1·P3c-2 동일 교훈):
  //   - grid: cloneGrid 후 mutate, project.grid 직접 mutate 금지.
  //   - pathMarks: `setPathMarks((prev) => new Set(prev))` 패턴. in-place `.add()` 금지 —
  //     (a) 리렌더 안 됨, (b) history snapshot이 살아있는 Set을 가리켜 undo가 엉뚱한
  //     마크 복원. 빌드로 안 잡힘.
  //
  //  도구별:
  //   - wall: stroke 시작 셀로 fill(WALL/EMPTY) 결정, drag 일관 적용.
  //   - path: stroke 시작 셀 마크 여부로 set/clear 결정, drag 일관 적용. grid 미변경.
  //   - goal: 클릭 1회 = 깃발 1개 (드래그 무시, 재클릭 토글).
  //   - start: 1개 이동, 드래그 가능.
  //
  //  History push (stroke 시작 시): grid·marks 양쪽 snapshot.
  const handlePaint = useCallback(
    (r: number, c: number, isInitial: boolean) => {
      // 도착점은 클릭 1회만 (P3a-2 후속).
      if (activeTool === "goal" && !isInitial) return;

      // ─ Path 도구 ─ grid 미변경, pathMarks만 변경.
      if (activeTool === "path") {
        const key = `${r},${c}`;

        if (isInitial) {
          pathStrokeModeRef.current = pathMarks.has(key) ? "clear" : "set";
        }
        const mode = pathStrokeModeRef.current ?? "set";

        // No-op 가드.
        if (mode === "set" && pathMarks.has(key)) return;
        if (mode === "clear" && !pathMarks.has(key)) return;

        // History push — 시작 시 1회. grid는 그대로 잡고, marks는 변경 직전 상태로 잡음.
        if (isInitial) {
          setHistory((h) => ({
            past: [
              ...h.past,
              { grid: project.grid, marks: pathMarks },
            ].slice(-HISTORY_DEPTH),
            future: [],
          }));
        }

        // 불변 갱신.
        setPathMarks((prev) => {
          const next = new Set(prev);
          if (mode === "set") next.add(key);
          else next.delete(key);
          return next;
        });
        return;
      }

      // ─ Wall / Goal / Start ─ grid 변경.
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

        // No-op 가드.
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

  // Undo — past 마지막 snapshot 복원, 현재(grid, marks) future에 push.
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      // 현재 grid·marks 캡처해 future에 push.
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

  // Redo — future 마지막 snapshot 복원, 현재 past에 push.
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

  // 그리드 초기화 (P3c-1) — grid empty + marks 클리어. 둘 다 history entry로 push.
  const handleResetGrid = useCallback(() => {
    setProject((p) => {
      const allEmpty = p.grid.every((row) => row.every((v) => v === TILE.EMPTY));
      const noMarks = pathMarks.size === 0;
      if (allEmpty && noMarks) return p; // no-op
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
  }, [pathMarks]);

  // "벽 생성" (P3c-2) — pathMarks를 grid에 반영하는 1회 commit.
  //   - 마크 셀     → EMPTY
  //   - start/goal  → 보존
  //   - 그 외       → WALL
  // 1 undo entry로 push. 커밋 후 marks 클리어 — 사용자가 새 패스 그리고 다시 commit 가능.
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

  // 키보드 단축키 — Step2 한정.
  useEffect(() => {
    if (step !== 2) return;
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
        labels={[tm.step1, tm.step2, tm.step3]}
        onStep={handleStepNav}
        disabledSteps={validation.ok ? undefined : [3]}
      />

      <div className="mt-6">
        {step === 1 && (
          <SettingsPanel
            size={project.size}
            fogOfWar={project.fogOfWar}
            fogRadius={project.fogRadius}
            onSizeChange={handleSizeChange}
            onFogToggle={handleFogToggle}
            onFogRadiusChange={handleFogRadiusChange}
            onStart={handleStart}
          />
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{tm.drawIntro}</p>
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
            <MazeGrid
              grid={project.grid}
              size={project.size}
              theme={project.theme}
              pathMarks={pathMarks}
              onPaint={handlePaint}
            />
            {/* PathCommitButton·ValidationPanel은 모두 그리드 아래.
                높이 변화가 그리드를 안 밀게 — 0.5.1에서 검증 패널에 적용한
                원칙을 0.7.1에서 PathCommitButton에도 확장. contextual
                액션(commit)이 상시 패널(검증/점수)보다 위. */}
            <PathCommitButton
              visible={activeTool === "path" && pathMarks.size > 0}
              onCommit={handleCommitWalls}
            />
            <ValidationPanel result={validation} score={score} />
          </div>
        )}
        {step === 3 && (
          <PlayMode project={project} onBackToEdit={() => setStep(2)} />
        )}
      </div>

      <ResetConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmOpen(false)}
      />
      <ResetConfirmDialog
        open={resetGridOpen}
        title={tm.resetGridTitle}
        message={tm.resetGridMessage}
        confirmLabel={tm.resetGridConfirm}
        onConfirm={handleResetGrid}
        onCancel={() => setResetGridOpen(false)}
      />
    </main>
  );
}
