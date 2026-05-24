"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { GameCanvas } from "@/components/shooter/game-canvas";
import { Hud } from "@/components/shooter/hud";
import {
  INITIAL_LIVES,
  LOGICAL_H,
  LOGICAL_W,
  type GameState,
  type HudSnapshot,
  type Intent,
} from "@/lib/shooter/types";
import {
  makeInitialState,
  startGameLoop,
  type GameLoopHandle,
} from "@/lib/shooter/loop";
import { CompositeInput } from "@/lib/shooter/input/composite";
import { KeyboardInput } from "@/lib/shooter/input/keyboard";
import { TouchInput } from "@/lib/shooter/input/touch";
import { emptyIntent, type InputController } from "@/lib/shooter/input/types";
import { buildVisualAssets, type VisualAssets } from "@/lib/shooter/visual/raster";
import { scoreStorage } from "@/lib/shooter/storage/localStorage";

/**
 * 아케이드 슈터 client orchestrator.
 *
 * 상태 모델:
 *   - GameState는 gameStateRef(mutable ref)가 owner. React state 아님.
 *   - 캔버스 render는 매 rAF tick. React 리렌더 0회.
 *   - HUD는 점수/생명/status 변화 시에만 setHud (loop의 onHudChange diff).
 *
 * 부팅 흐름:
 *   1. assets = await buildVisualAssets()  (lucide raster 1회 베이킹)
 *   2. canvas resize/DPR 설정
 *   3. input controller start (keyboard + touch composite)
 *   4. startGameLoop — gameStateRef 소비 + onHudChange 콜백으로 HUD 갱신
 *
 * 게임오버 시 onGameOver에서 scoreStorage.saveScore. 재시작은 loop.restart() — ref 교체.
 */
export function ShooterClientShell() {
  const t = useMessages().shooter;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(makeInitialState());
  const highScoreRef = useRef<number>(0);
  const inputRef = useRef<InputController | null>(null);
  const loopRef = useRef<GameLoopHandle | null>(null);
  const assetsRef = useRef<VisualAssets | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    lives: INITIAL_LIVES,
    status: "playing",
    highScore: 0,
    isNewHighScore: false,
  }));
  const [ready, setReady] = useState(false);
  const [startedOnce, setStartedOnce] = useState(false);
  // startedOnce를 closure에서 매 frame 읽기 위한 mirror. set 함수가 inline으로 갱신.
  const startedOnceRef = useRef(false);

  /** 캔버스 DPR-aware resize. 논리 좌표 360×640 유지. */
  const fitCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || LOGICAL_W;
    const cssH = canvas.clientHeight || LOGICAL_H;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // 논리 좌표가 캔버스 CSS 크기와 일치하도록 scale.
    const sx = canvas.width / LOGICAL_W;
    const sy = canvas.height / LOGICAL_H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    return ctx;
  }, []);

  // 부팅 — assets 빌드 + 최고점 로드.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [assets, hs] = await Promise.all([
        buildVisualAssets(),
        scoreStorage.getHighScore(),
      ]);
      if (cancelled) return;
      assetsRef.current = assets;
      highScoreRef.current = hs;
      setHud((prev) => ({ ...prev, highScore: hs }));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 메인 루프 — ready 후 1회 mount.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const assets = assetsRef.current;
    if (!canvas || !assets) return;

    const ctx = fitCanvas(canvas);
    if (!ctx) return;

    // input: keyboard + touch composite.
    const input = new CompositeInput([
      new KeyboardInput(),
      new TouchInput(() => canvas),
    ]);
    input.start();
    inputRef.current = input;

    // ResizeObserver — 컨테이너 크기/DPR 변화 시 backing store 재설정.
    let pendingFit = false;
    const ro = new ResizeObserver(() => {
      if (pendingFit) return;
      pendingFit = true;
      requestAnimationFrame(() => {
        pendingFit = false;
        if (canvasRef.current) fitCanvas(canvasRef.current);
      });
    });
    ro.observe(canvas);

    // 루프 시작 — getIntent는 startedOnce 전엔 빈 intent (자동 발사 방지).
    const getIntent = (): Intent => {
      if (!startedOnceRef.current) return emptyIntent();
      return input.getIntent();
    };
    const loop = startGameLoop({
      canvas,
      ctx,
      getIntent,
      stateRef: gameStateRef,
      assets,
      highScoreRef,
      onHudChange: setHud,
      onGameOver: (finalScore) => {
        void scoreStorage.saveScore(finalScore).then(async () => {
          const updated = await scoreStorage.getHighScore();
          highScoreRef.current = updated;
        });
      },
    });
    loopRef.current = loop;

    return () => {
      loop.stop();
      input.stop();
      ro.disconnect();
      inputRef.current = null;
      loopRef.current = null;
    };
  }, [ready, fitCanvas]);

  const handleStart = useCallback(() => {
    startedOnceRef.current = true;
    setStartedOnce(true);
    // 캔버스에 포커스 — 키보드 입력 즉시 받게.
    canvasRef.current?.focus();
  }, []);

  const handleRestart = useCallback(() => {
    loopRef.current?.restart();
    startedOnceRef.current = true;
    setStartedOnce(true);
    canvasRef.current?.focus();
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t.description}
        </p>
      </header>

      <div className="space-y-3">
        <Hud
          hud={hud}
          onRestart={handleRestart}
          startedOnce={startedOnce}
          onStart={handleStart}
        />
        <div className="rounded-md border border-zinc-800 bg-black p-2">
          <GameCanvas ref={canvasRef} />
        </div>
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">{t.controlsHintDesktop}</span>
          <span className="sm:hidden">{t.controlsHintMobile}</span>
        </p>
      </div>
    </main>
  );
}
