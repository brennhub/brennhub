"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchScores, submitScore, type ScoreEntry } from "@/lib/hub/scores";

const NAME_KEY = "brennhub-arcade-name";

/**
 * 게임오버 오버레이 (캔버스 위 absolute React). 익명 점수 제출 + 상위 N 표시.
 * 텍스트 전부 영어. 이름은 localStorage 기억(실제 Next 앱). 제출/에러 상태 표시.
 * onPlayAgain: 오버레이 숨김 + 게임 재시작(shell이 canvas에 pointerdown 디스패치).
 */
export function LeaderboardOverlay({
  slug,
  score,
  onPlayAgain,
}: {
  slug: string;
  score: number;
  onPlayAgain: () => void;
}) {
  const [name, setName] = useState("");
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [listError, setListError] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [mine, setMine] = useState<{ name: string; score: number } | null>(null);

  useEffect(() => {
    let ignore = false;
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      // ignore
    }
    void fetchScores(slug).then((r) => {
      if (ignore) return;
      if (r) setScores(r);
      else setListError(true); // null = 로드 실패 → "Loading…" 고착 방지 (별도 에러 표시).
    });
    return () => {
      ignore = true;
    };
  }, [slug]);

  const handleSubmit = useCallback(async () => {
    const n = name.trim();
    if (n.length < 1 || status === "submitting" || status === "submitted") return;
    setStatus("submitting");
    const ok = await submitScore(slug, n, score);
    if (!ok) {
      setStatus("error");
      return;
    }
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      // ignore
    }
    setMine({ name: n, score });
    setStatus("submitted");
    const fresh = await fetchScores(slug);
    if (fresh) setScores(fresh); // 재조회 실패 시 기존 목록 유지 (blank 방지).
  }, [name, score, slug, status]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center backdrop-blur-[2px]">
      <p className="text-2xl font-bold uppercase tracking-[0.15em] text-rose-300">Game Over</p>
      <p className="tnum text-sm text-zinc-300">
        Score: <span className="font-semibold text-amber-300">{score}</span>
      </p>

      {status !== "submitted" ? (
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            placeholder="Your name"
            aria-label="Your name"
            className="w-36 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "submitting" || name.trim().length < 1}
            className="rounded-md bg-amber-400 px-3 py-1 text-sm font-semibold text-zinc-900 disabled:opacity-40"
          >
            {status === "submitting" ? "…" : "Submit"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-emerald-400">Score submitted ✓</p>
      )}
      {status === "error" && (
        <p className="text-xs text-rose-400">Could not submit — try again in a moment.</p>
      )}

      <ol className="w-full max-w-[260px] space-y-0.5 text-left text-xs text-zinc-300">
        {listError && <li className="text-zinc-500">Couldn’t load scores.</li>}
        {!listError && scores === null && <li className="text-zinc-500">Loading…</li>}
        {!listError && scores?.length === 0 && (
          <li className="text-zinc-500">No scores yet — be the first!</li>
        )}
        {!listError &&
          (scores ?? []).map((s, i) => {
            const isMine = !!mine && s.name === mine.name && s.score === mine.score;
            return (
              <li
                key={i}
                className={
                  "flex justify-between gap-2 rounded px-1.5 py-0.5 tnum " +
                  (isMine ? "bg-amber-400/20 text-amber-200" : "")
                }
              >
                <span className="truncate">
                  {i + 1}. {s.name}
                </span>
                <span className="font-semibold">{s.score}</span>
              </li>
            );
          })}
      </ol>

      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-1 rounded-md border border-zinc-600 px-3 py-1 text-sm font-medium text-zinc-200 hover:border-zinc-400"
      >
        Play Again
      </button>
    </div>
  );
}
