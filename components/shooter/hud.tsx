"use client";

import { Heart, Volume2, VolumeX } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import type { HudSnapshot } from "@/lib/shooter/types";
import type { Difficulty } from "@/lib/shooter/types";
import { MAX_LIVES } from "@/lib/shooter/types";
import { DIFFICULTIES } from "@/lib/shooter/data/difficulty";

type Props = {
  hud: HudSnapshot;
  startedOnce: boolean;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onStart: () => void;
  onRestart: () => void;
  muted: boolean;
  onToggleMute: () => void;
};

export function Hud({
  hud,
  startedOnce,
  difficulty,
  onDifficultyChange,
  onStart,
  onRestart,
  muted,
  onToggleMute,
}: Props) {
  const t = useMessages().shooter;

  const livesToShow = Math.max(hud.lives, MAX_LIVES);

  return (
    <div className="mx-auto w-full max-w-[368px] space-y-2 sm:max-w-[428px] lg:max-w-[488px]">
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
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.soundUnmute : t.soundMute}
            title={muted ? t.soundUnmute : t.soundMute}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
            <Heart key={i} className="size-4 fill-rose-500 text-rose-500" />
          ))}
          {Array.from({ length: Math.max(0, livesToShow - hud.lives) }).map(
            (_, i) =>
              hud.lives <= MAX_LIVES && i < MAX_LIVES - hud.lives ? (
                <Heart key={`e${i}`} className="size-4 text-zinc-700" />
              ) : null,
          )}
        </div>
      </div>

      {!startedOnce && hud.status === "playing" && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-400">
            {t.difficultyLabel}
          </p>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((d) => {
              const selected = difficulty === d;
              const label =
                d === "easy"
                  ? t.difficultyEasy
                  : d === "normal"
                    ? t.difficultyNormal
                    : t.difficultyHard;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDifficultyChange(d)}
                  className={
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                    (selected
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onStart}
            className="mt-3 w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-400"
          >
            {t.startButton}
          </button>
        </div>
      )}

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
