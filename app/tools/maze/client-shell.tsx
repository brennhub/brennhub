"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { TILE, type MazeProject, type MazeSize } from "@/lib/maze/types";
import { cloneGrid, emptyGrid, findStart, newProject } from "@/lib/maze/grid";
import { loadProject, saveProject } from "@/lib/maze/storage";
import { StepNav, type Step } from "@/components/maze/step-nav";
import { SettingsPanel } from "@/components/maze/settings-panel";
import { ToolPalette, type Tool } from "@/components/maze/tool-palette";
import { MazeGrid } from "@/components/maze/maze-grid";
import { ResetConfirmDialog } from "@/components/maze/reset-confirm-dialog";

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

  // StepNav 클릭 — 2→1은 맵 초기화 확인 다이얼로그를 거친다.
  const handleStepNav = useCallback(
    (next: Step) => {
      if (next === step) return;
      if (next === 2) handleStart();
      else setConfirmOpen(true);
    },
    [step, handleStart],
  );

  // 확인 — 맵 전면 리셋 후 설정 단계로 (size/fog 설정은 유지).
  const handleConfirmReset = useCallback(() => {
    setProject((p) => ({ ...p, grid: [] }));
    setStep(1);
    setConfirmOpen(false);
  }, []);

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
        labels={[tm.step1, tm.step2]}
        onStep={handleStepNav}
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
            <MazeGrid
              grid={project.grid}
              size={project.size}
              onPaint={handlePaint}
            />
          </div>
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
