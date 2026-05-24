"use client";

import { Heart } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import type { HudSnapshot } from "@/lib/shooter/types";
import { INITIAL_LIVES } from "@/lib/shooter/types";

type Props = {
  hud: HudSnapshot;
  onRestart: () => void;
  startedOnce: boolean;
  onStart: () => void;
};

export function Hud({ hud, onRestart, startedOnce, onStart }: Props) {
  const t = useMessages().shooter;

  return (
    <div className="mx-auto w-full max-w-[360px] space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-zinc-200">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            {t.scoreLabel}
          </span>
          <span className="tnum text-lg font-semibold">{hud.score}</span>
          {hud.isNewHighScore && hud.score > 0 && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
              {t.newHighScore}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            {t.highScoreLabel}
          </span>
          <span className="tnum text-sm text-zinc-300">{hud.highScore}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={
                "size-4 " +
                (i < hud.lives
                  ? "fill-rose-500 text-rose-500"
                  : "text-zinc-700")
              }
            />
          ))}
        </div>
        {!startedOnce && hud.status === "playing" && (
          <button
            type="button"
            onClick={onStart}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            {t.startButton}
          </button>
        )}
      </div>
      {hud.status === "gameover" && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-center">
          <p className="text-lg font-semibold text-zinc-100">{t.gameOverTitle}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {t.scoreLabel}: <span className="tnum text-zinc-200">{hud.score}</span>
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            {t.restartButton}
          </button>
        </div>
      )}
    </div>
  );
}
