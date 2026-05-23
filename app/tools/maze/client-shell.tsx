"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { TILE, type MazeProject, type MazeSize } from "@/lib/maze/types";
import { cloneGrid, emptyGrid, findStart, newProject } from "@/lib/maze/grid";
import { loadProject, saveProject } from "@/lib/maze/storage";
import { scoreMaze, validateMaze } from "@/lib/maze/validate";
import { StepNav, type Step } from "@/components/maze/step-nav";
import { SettingsPanel } from "@/components/maze/settings-panel";
import { ToolPalette, type Tool } from "@/components/maze/tool-palette";
import { MazeGrid } from "@/components/maze/maze-grid";
import { ResetConfirmDialog } from "@/components/maze/reset-confirm-dialog";
import { ValidationPanel } from "@/components/maze/validation-panel";
import { PlayMode } from "@/components/maze/play-mode";

export function MazeClientShell() {
  const t = useMessages();
  const tm = t.maze;

  const [project, setProject] = useState<MazeProject>(() => newProject());
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const handleStart = useCallback(() => {
    setProject((p) => ({ ...p, grid: emptyGrid(p.size) }));
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

  // 확인 — 맵 전면 리셋 후 설정 단계로 (size/fog 설정은 유지).
  const handleConfirmReset = useCallback(() => {
    setProject((p) => ({ ...p, grid: [] }));
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

  // 셀 페인트 — 활성 도구에 따라 타일 결정.
  const handlePaint = useCallback(
    (r: number, c: number) => {
      setProject((p) => {
        const grid = cloneGrid(p.grid);
        if (activeTool === "wall") {
          grid[r][c] = TILE.WALL;
        } else if (activeTool === "eraser") {
          grid[r][c] = TILE.EMPTY;
        } else if (activeTool === "goal") {
          // 도착점은 여러 개 배치 가능.
          grid[r][c] = TILE.GOAL;
        } else {
          // 시작점은 1개만 — 기존 시작점을 비우고 새 위치로 이동.
          const prev = findStart(grid);
          if (prev) grid[prev.r][prev.c] = TILE.EMPTY;
          grid[r][c] = TILE.START;
        }
        return { ...p, grid };
      });
    },
    [activeTool],
  );

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
            <ValidationPanel result={validation} score={score} />
            <MazeGrid
              grid={project.grid}
              size={project.size}
              theme={project.theme}
              onPaint={handlePaint}
            />
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
    </main>
  );
}
