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
import { PlayMode } from "@/components/maze/play-mode";

/**
 * Undo/Redo 히스토리 깊이 상한 (P3c-1).
 *
 * 메모리 정정 (1차 계산 4KB는 오해 — JS 2D number 배열은 packed byte가 아님):
 *   64×64 ≈ 4096 원소 × ~8B + 배열 오버헤드 ≈ ~32KB/snapshot.
 *   100 deep ≈ 3~4MB. 사용자 디자인 1회분으로 무시 가능 — 100 유지.
 */
const HISTORY_DEPTH = 100;

type GridHistory = {
  past: TileType[][][];
  future: TileType[][][];
};

const EMPTY_HISTORY: GridHistory = { past: [], future: [] };

export function MazeClientShell() {
  const t = useMessages();
  const tm = t.maze;

  const [project, setProject] = useState<MazeProject>(() => newProject());
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // P3c-1: 그리드 초기화 모달 (Step2 유지, grid만 비움).
  const [resetGridOpen, setResetGridOpen] = useState(false);
  // P3c-1: stroke 단위 undo/redo 히스토리.
  const [history, setHistory] = useState<GridHistory>(EMPTY_HISTORY);
  // P3c-1: 벽 stroke 일관성 — pointerdown 시 시작 셀로 결정한 fill을 stroke 전체에 적용.
  const strokeFillRef = useRef<TileType | null>(null);

  // hydrate — localStorage 로드. grid가 있으면 그리기 단계로 복원.
  useEffect(() => {
    const loaded = loadProject();
    setProject(loaded);
    setStep(loaded.grid.length > 0 ? 2 : 1);
    setHydrated(true);
  }, []);

  // persist — hydrate 이후 변경분만 저장.
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

  // Step1 → Step2 — 현재 사이즈로 빈 격자를 빌드 (사이즈 잠금 시점).
  // 새 grid에 대한 히스토리는 비움 — 이전 stroke들이 사이즈 다른 grid 참조라 호환 X.
  const handleStart = useCallback(() => {
    setProject((p) => ({ ...p, grid: emptyGrid(p.size) }));
    setHistory(EMPTY_HISTORY);
    setStep(2);
  }, []);

  // StepNav 클릭 — 1↔2↔3 전이.
  //  - 2/3 → 1: 맵 초기화 확인 다이얼로그.
  //  - 1 → 2: 격자 빌드(handleStart).
  //  - 2 → 3: 검증 통과 시에만 (Step3 disabled 처리로 막지만 방어).
  //  - 3 → 2: 그대로 복귀 (편집 재개).
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

  // 확인 — 맵 전면 리셋 후 설정 단계로 (size/fog 설정은 유지). 히스토리도 클리어.
  const handleConfirmReset = useCallback(() => {
    setProject((p) => ({ ...p, grid: [] }));
    setHistory(EMPTY_HISTORY);
    setStep(1);
    setConfirmOpen(false);
  }, []);

  // 완결성 검증 — grid 변경마다 라이브 재계산. 64×64도 BFS 즉시(µs 수준).
  // 규칙2(외곽 폐쇄)는 boundary clamp으로 자동 충족 — validate에서 별도 체크 없음.
  // P3b 플레이어 이동도 동일 clamp 규약을 따른다(BFS 통과성 == 이동 통과성).
  const validation = useMemo(() => validateMaze(project.grid), [project.grid]);
  // 품질 점수 (P3a-2) — 완결성 통과 시에만 산출. 게이팅 X — Step3 활성 조건은
  // validation.ok 그대로. 점수는 보여주기만 (별점·차원 바·약점 안내).
  const score = useMemo(
    () => (validation.ok ? scoreMaze(project.grid) : null),
    [project.grid, validation.ok],
  );

  // archetype 임계값 보정용 콘솔 신호 (P3a-2 1차안).
  // UI는 차원별 norm만 노출 — composite total(sqrt(A·B))은 패널에 안 보인다.
  // 4개 archetype(빈 들판/벽 허술/외길/제대로 된 미로) total을 손계산 없이 읽기 위한 임시 신호.
  // **P4 live 전 제거** (BACKLOG: "dev archetype 임계값 보정용 콘솔 신호 제거").
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

  // 셀 페인트 (P3c-1 재작성) — 활성 도구별 분기 + stroke 일관성 + no-op 가드 + history push.
  //  - 불변 갱신 유지: project.grid는 절대 in-place mutate 금지. cloneGrid 후에만 set.
  //    이유 (a) score/validation useMemo가 grid 참조 불변으로 깨짐, (b) past가 같은 객체
  //    참조를 잡고 있어 스냅샷이 오염됨. 빌드로 안 잡히는 종류라 명시.
  //  - No-op 가드: 실제 grid 변경 없으면 history도 setProject도 skip. 시작점 동위치
  //    클릭 같은 idempotent 액션이 history를 더럽히지 않게.
  //  - 벽 stroke 일관성: pointerdown 시 시작 셀 값으로 stroke 전체 fill(WALL ↔ EMPTY) 결정,
  //    drag pointermove는 그 값을 그대로 적용 — per-cell 토글의 드래그 엉킴 차단.
  const handlePaint = useCallback(
    (r: number, c: number, isInitial: boolean) => {
      // 도착점은 클릭 1회 = 깃발 1개. 드래그 무시 (P3a-2 후속 교정).
      if (activeTool === "goal" && !isInitial) return;

      setProject((p) => {
        // 1) 도구별 next 값 결정.
        let nextTile: TileType;
        if (activeTool === "wall") {
          if (isInitial) {
            // 시작 셀이 벽이면 stroke = EMPTY (지우기), 그 외(EMPTY/START/GOAL)면 WALL.
            strokeFillRef.current =
              p.grid[r][c] === TILE.WALL ? TILE.EMPTY : TILE.WALL;
          }
          nextTile = strokeFillRef.current ?? TILE.WALL;
        } else if (activeTool === "goal") {
          // 재클릭 토글.
          nextTile = p.grid[r][c] === TILE.GOAL ? TILE.EMPTY : TILE.GOAL;
        } else {
          nextTile = TILE.START;
        }

        // 2) No-op 가드.
        if (activeTool === "start") {
          // 시작점이 이미 그 셀이면 변경 없음.
          const prev = findStart(p.grid);
          if (prev && prev.r === r && prev.c === c) return p;
        } else if (p.grid[r][c] === nextTile) {
          return p;
        }

        // 3) 실제 변경 발생 — stroke 시작이면 history push.
        //    함수형 update 안에서 다른 setState 호출은 React 18 batching에 묶임 — OK.
        if (isInitial) {
          setHistory((h) => ({
            past: [...h.past, p.grid].slice(-HISTORY_DEPTH),
            future: [],
          }));
        }

        // 4) 불변 갱신 — clone 후 set, 원본 grid는 안 건드림.
        const grid = cloneGrid(p.grid);
        if (activeTool === "start") {
          const prev = findStart(grid);
          if (prev) grid[prev.r][prev.c] = TILE.EMPTY;
        }
        grid[r][c] = nextTile;
        return { ...p, grid };
      });
    },
    [activeTool],
  );

  // Undo — 가장 최근 past를 grid로 복원, 현재 grid는 future에 push.
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      setProject((p) => {
        // 현재 grid를 future에 push. 불변 — grid 원본 그대로 (변경 없음).
        setHistory((hh) => ({
          past: hh.past,
          future: [...hh.future, p.grid].slice(-HISTORY_DEPTH),
        }));
        return { ...p, grid: prev };
      });
      return { past: newPast, future: h.future };
    });
  }, []);

  // Redo — 가장 최근 future를 grid로 복원, 현재 grid는 past에 push.
  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      const newFuture = h.future.slice(0, -1);
      setProject((p) => {
        setHistory((hh) => ({
          past: [...hh.past, p.grid].slice(-HISTORY_DEPTH),
          future: hh.future,
        }));
        return { ...p, grid: next };
      });
      return { past: h.past, future: newFuture };
    });
  }, []);

  // 그리드 초기화 (P3c-1) — Step2 유지, grid만 EMPTY로. history entry로 push되어 undo 가능.
  const handleResetGrid = useCallback(() => {
    setProject((p) => {
      // 이미 빈 grid면 no-op.
      const allEmpty = p.grid.every((row) => row.every((v) => v === TILE.EMPTY));
      if (allEmpty) return p;
      setHistory((h) => ({
        past: [...h.past, p.grid].slice(-HISTORY_DEPTH),
        future: [],
      }));
      return { ...p, grid: emptyGrid(p.size) };
    });
    setResetGridOpen(false);
  }, []);

  // 키보드 단축키 — Step2 한정 mount. Step3는 unmount 상태라 play-controls 방향키와 충돌 0.
  //  Ctrl+Z / Cmd+Z         → undo
  //  Ctrl+Y / Ctrl+Shift+Z  → redo
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
            {/* 그리드를 위, 검증·점수 패널을 아래로 — 패널 높이 변화(✗ ↔ 통과 ↔
                weakness)가 그리드를 밀어 사용자가 그리던 셀 위치를 잃지 않게.
                P3a-2 후속 교정. */}
            <MazeGrid
              grid={project.grid}
              size={project.size}
              theme={project.theme}
              onPaint={handlePaint}
            />
            <ValidationPanel result={validation} score={score} />
          </div>
        )}
        {step === 3 && (
          <PlayMode project={project} onBackToEdit={() => setStep(2)} />
        )}
      </div>

      {/* Step2/3 → Step1 전환 모달 (기존). */}
      <ResetConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmOpen(false)}
      />
      {/* 그리드 초기화 모달 (P3c-1 신규) — Step2 유지하며 grid만 비움, undo 가능. */}
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
