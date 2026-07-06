"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { GameCanvas } from "@/components/arcade/game-canvas";
import { Engine, clamp } from "@/lib/arcade/engine";
import "@/lib/arcade/games"; // side-effect: 6종 게임을 Engine에 등록

/**
 * 아케이드 단일-게임 공용 셸 — 한 tool = 한 게임(탭 선택기 없음).
 * shooter 셸 골격: fitCanvas · ResizeObserver · cleanup destroy.
 * 게임 로직(engine·games)은 무수정 — 이 셸은 넘겨받은 gameId를 setActive 할 뿐.
 * 헤더는 tool i18n(tools[slug])에서, aspect·좌표는 Engine에서.
 */
export function GameShell({ gameId, slug }: { gameId: string; slug: string }) {
  const messages = useMessages();
  const meta = messages.tools[slug] ?? { name: gameId, description: "" };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aspect = Engine.getAspect(gameId);

  /** DPR-aware backing 설정 → 논리 W/H 반환. 논리×DPR(정수배) 후 setTransform. */
  const fitCanvas = useCallback((canvas: HTMLCanvasElement, asp: number) => {
    const cssW = canvas.clientWidth || canvas.parentElement?.clientWidth || 360;
    const W = clamp(Math.round(cssW), 280, 860);
    const H = Math.round(W * asp);
    const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { W, H };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    Engine.attach(canvas);
    const { W, H } = fitCanvas(canvas, Engine.getAspect(gameId));
    Engine.resize(W, H);
    Engine.setActive(gameId);
    Engine.start();

    let pendingFit = false;
    const ro = new ResizeObserver(() => {
      if (pendingFit) return;
      pendingFit = true;
      requestAnimationFrame(() => {
        pendingFit = false;
        const cv = canvasRef.current;
        if (!cv) return;
        const size = fitCanvas(cv, Engine.activeAspect());
        Engine.resize(size.W, size.H);
      });
    });
    ro.observe(canvas);

    return () => {
      Engine.destroy();
      ro.disconnect();
    };
  }, [gameId, fitCanvas]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-20">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {meta.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{meta.description}</p>
      </header>
      <div className="mx-auto w-full max-w-[860px] rounded-md border border-zinc-800 bg-black p-1">
        <GameCanvas ref={canvasRef} aspect={aspect} />
      </div>
    </main>
  );
}
