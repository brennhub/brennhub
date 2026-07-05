"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { GameCanvas } from "@/components/arcade/game-canvas";
import { Engine, clamp } from "@/lib/arcade/engine";
import { ARCADE_GAMES } from "@/lib/arcade/games";

/**
 * Arcade client shell — 단일 canvas + 공용 Engine (활성 게임 1개만 tick).
 * shooter shell 골격 차용: fitCanvas · ResizeObserver · cleanup return.
 *
 *   mount:   Engine.attach → fitCanvas(→논리 W/H) → Engine.resize → setActive → start
 *   resize:  ResizeObserver → fitCanvas → Engine.resize  (window.resize 미사용, shooter 규약)
 *   cleanup: Engine.destroy + ro.disconnect  (RAF·리스너 누수 0 · fast-refresh/재진입 안전)
 *
 * 게임 선택 UI는 v1(1종)이라 목록이 1이면 숨김 — selector 자리만 확보(다음 배치서 탭 확장).
 */
export function ArcadeClientShell() {
  const messages = useMessages();
  const meta = messages.tools.arcade ?? { name: "Arcade", description: "" };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeId, setActiveId] = useState<string>(ARCADE_GAMES[0].id);

  const aspect = Engine.getAspect(activeId);

  /** DPR-aware backing 설정 → 논리 W/H 반환. 논리×DPR(정수배) 후 setTransform. */
  const fitCanvas = useCallback((canvas: HTMLCanvasElement, asp: number) => {
    const cssW = canvas.clientWidth || canvas.parentElement?.clientWidth || 360;
    const W = clamp(Math.round(cssW), 280, 860);
    const H = Math.round(W * asp);
    const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
    // canvas.width 설정이 transform을 리셋하므로 반드시 그 뒤에 setTransform.
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
    const { W, H } = fitCanvas(canvas, Engine.getAspect(activeId));
    Engine.resize(W, H);
    Engine.setActive(activeId);
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
  }, [activeId, fitCanvas]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-20">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {meta.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{meta.description}</p>
      </header>

      <div className="space-y-3">
        {/* 게임 selector — v1은 1종이라 숨김. 구조만 확보(다음 배치서 탭 6개로 확장). */}
        {ARCADE_GAMES.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {ARCADE_GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveId(g.id)}
                aria-pressed={g.id === activeId}
                className={
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
                  (g.id === activeId
                    ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600")
                }
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto w-full max-w-[420px] rounded-md border border-zinc-800 bg-black p-1">
          <GameCanvas ref={canvasRef} aspect={aspect} />
        </div>
      </div>
    </main>
  );
}
