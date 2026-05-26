"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { GameCanvas } from "@/components/shooter/game-canvas";
import { Hud } from "@/components/shooter/hud";
import {
  LOGICAL_H,
  LOGICAL_W,
  type Difficulty,
  type GameState,
  type HudSnapshot,
  type Intent,
} from "@/lib/shooter/types";
import {
  makeInitialState,
  startGameLoop,
  type GameLoopHandle,
  type SoundEvents,
} from "@/lib/shooter/loop";
import { CompositeInput } from "@/lib/shooter/input/composite";
import { KeyboardInput } from "@/lib/shooter/input/keyboard";
import { TouchInput } from "@/lib/shooter/input/touch";
import { emptyIntent, type InputController } from "@/lib/shooter/input/types";
import { buildVisualAssets, type VisualAssets } from "@/lib/shooter/visual/raster";
import { scoreStorage } from "@/lib/shooter/storage/localStorage";
import { createSoundController, type SoundController } from "@/lib/shooter/sound";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_MODS,
  DIFFICULTY_STORAGE_KEY,
} from "@/lib/shooter/data/difficulty";

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
 * 사운드는 user gesture 후 AudioContext.resume — handleStart에서 호출.
 * 난이도는 localStorage 영속 (마지막 선택 기억).
 */
export function ShooterClientShell() {
  const messages = useMessages();
  const t = messages.shooter;
  const tCommon = messages.toolCommon;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(makeInitialState(DEFAULT_DIFFICULTY));
  const highScoreRef = useRef<number>(0);
  const inputRef = useRef<InputController | null>(null);
  const loopRef = useRef<GameLoopHandle | null>(null);
  const assetsRef = useRef<VisualAssets | null>(null);
  const soundRef = useRef<SoundController | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    lives: DIFFICULTY_MODS[DEFAULT_DIFFICULTY].initialLives,
    status: "playing",
    highScore: 0,
    isNewHighScore: false,
  }));
  const [ready, setReady] = useState(false);
  const [startedOnce, setStartedOnce] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [muted, setMuted] = useState(false);
  const startedOnceRef = useRef(false);

  /** DPR-aware canvas resize — 정수 scale 강제 + image-rendering: pixelated. */
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
    // cssH는 aspect-ratio로 결정 — fitCanvas는 ref만 검증.
    void cssH;
    return ctx;
  }, []);

  // 부팅 — assets 빌드 + 최고점 로드 + 사운드 컨트롤러 생성 + 난이도 hydrate.
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

      const snd = createSoundController();
      soundRef.current = snd;
      setMuted(snd.isMuted());

      let initialDifficulty: Difficulty = DEFAULT_DIFFICULTY;
      try {
        const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
        if (raw && (DIFFICULTIES as string[]).includes(raw)) {
          initialDifficulty = raw as Difficulty;
        }
      } catch {
        // ignore
      }
      setDifficulty(initialDifficulty);
      gameStateRef.current = makeInitialState(initialDifficulty);

      setHud({
        score: 0,
        lives: DIFFICULTY_MODS[initialDifficulty].initialLives,
        status: "playing",
        highScore: hs,
        isNewHighScore: false,
      });
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

    const input = new CompositeInput([
      new KeyboardInput(),
      new TouchInput(() => canvas),
    ]);
    input.start();
    inputRef.current = input;

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

    const getIntent = (): Intent => {
      if (!startedOnceRef.current) return emptyIntent();
      return input.getIntent();
    };

    // 사운드 이벤트 → controller 메서드. update의 fixed-step에서 호출되므로
    // ref로 항상 최신 controller (mute 토글 등) 접근.
    const soundEvents: SoundEvents = {
      onShoot: () => soundRef.current?.playShoot(),
      onHit: () => soundRef.current?.playHit(),
      onPickup: () => soundRef.current?.playPickup(),
      onGameOver: () => soundRef.current?.playGameOver(),
    };

    const loop = startGameLoop({
      canvas,
      ctx,
      getIntent,
      stateRef: gameStateRef,
      assets,
      highScoreRef,
      onHudChange: setHud,
      isPaused: () => !startedOnceRef.current,
      sound: soundEvents,
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

  const handleDifficultyChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    // 시작 전이므로 ref를 새 difficulty로 재구성 + HUD 즉시 반영.
    gameStateRef.current = makeInitialState(d);
    setHud((prev) => ({
      ...prev,
      lives: DIFFICULTY_MODS[d].initialLives,
      score: 0,
      status: "playing",
      isNewHighScore: false,
    }));
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, d);
    } catch {
      // ignore
    }
  }, []);

  const handleStart = useCallback(() => {
    // user gesture 직후 AudioContext.resume.
    void soundRef.current?.resume();
    // 현 difficulty로 state 재구성 보장 (난이도 picker 후 시작 사이에 다른 변경 없게).
    loopRef.current?.restart(difficulty);
    startedOnceRef.current = true;
    setStartedOnce(true);
    canvasRef.current?.focus();
  }, [difficulty]);

  const handleRestart = useCallback(() => {
    void soundRef.current?.resume();
    loopRef.current?.restart(difficulty);
    startedOnceRef.current = true;
    setStartedOnce(true);
    canvasRef.current?.focus();
  }, [difficulty]);

  const handleToggleMute = useCallback(() => {
    const snd = soundRef.current;
    if (!snd) return;
    const next = !snd.isMuted();
    snd.setMuted(next);
    setMuted(next);
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
          startedOnce={startedOnce}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          onStart={handleStart}
          onRestart={handleRestart}
          muted={muted}
          onToggleMute={handleToggleMute}
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
