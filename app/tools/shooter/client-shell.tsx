"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const messages = useMessages();
  const t = messages.shooter;
  const tCommon = messages.toolCommon;

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

  /**
   * 캔버스 DPR-aware resize. 논리 좌표 360×640 유지.
   *
   * 핵심: backing scale을 LOGICAL_W의 **정수배**로 강제 (`Math.ceil` 후 max(1)).
   * 분수 scale(예: 480/360=1.333)이면 픽셀 grid가 sub-px 정렬돼 nearest로도
   * 깨져 보임. 정수 scale로 backing pixel과 sprite cell이 정확히 일치하게.
   * backing이 cssW*dpr보다 살짝 큰 경우 브라우저가 CSS로 다운스케일하지만,
   * `image-rendering: pixelated` CSS로 nearest 강제라 grid 보존.
   */
  const fitCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || LOGICAL_W;
    const cssH = canvas.clientHeight || LOGICAL_H;
    const needPx = cssW * dpr;
    const scale = Math.max(1, Math.ceil(needPx / LOGICAL_W));
    canvas.width = LOGICAL_W * scale;
    canvas.height = LOGICAL_H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
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
      // 시작 버튼 누르기 전엔 update skip — spawn 진행으로 생명 깎이는 버그 방지.
      isPaused: () => !startedOnceRef.current,
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
      <div className="mb-3">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {tCommon.back}
        </Link>
      </div>
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
        <div className="mx-auto w-full max-w-[368px] rounded-md border border-zinc-800 bg-black p-1 sm:max-w-[428px] lg:max-w-[488px]">
          <GameCanvas ref={canvasRef}>
            {!startedOnce && ready && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-300/80">
                  {t.startButton}
                </p>
              </div>
            )}
            {startedOnce && hud.status === "gameover" && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 backdrop-blur-[1px]">
                <p className="text-2xl font-bold uppercase tracking-[0.15em] text-rose-300">
                  {t.gameOverTitle}
                </p>
                <p className="tnum text-sm text-zinc-300">
                  {t.scoreLabel} {hud.score}
                </p>
              </div>
            )}
          </GameCanvas>
        </div>
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">{t.controlsHintDesktop}</span>
          <span className="sm:hidden">{t.controlsHintMobile}</span>
        </p>
      </div>
    </main>
  );
}
