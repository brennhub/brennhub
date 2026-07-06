"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/user-provider";
import { fetchScores, submitScore, type ScoreEntry } from "@/lib/hub/scores";

const NAME_KEY = "brennhub-arcade-name";
const MAX_NAME = 12; // 서버 sanitize와 동일 상한 (코드포인트 기준).

/** 서버 route.ts sanitizeName와 동일 규칙 — 제어문자 제거 + trim + 코드포인트 MAX_NAME자 컷. 표시=제출값 일치용. */
function clampName(raw: string): string {
  const kept = Array.from(raw.trim()).filter((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    return c >= 0x20 && c !== 0x7f;
  });
  return kept.slice(0, MAX_NAME).join("").trim();
}

/**
 * 게임오버 오버레이 (캔버스 위 absolute React). 익명 점수 제출 + 상위 N 표시.
 * 이름: 로그인 유저는 계정 표시명(display_name > name) 자동 프리필 → 클릭 한 번 제출, "Edit"로 수정.
 *       비로그인/계정명 없음 → 수동 입력(localStorage 기억) 폴백. 제출은 로그인 강제 없이 익명 POST 그대로.
 *       이메일은 공개 랭킹 노출 방지 위해 프리필 fallback에서 제외.
 * 텍스트 전부 영어. onPlayAgain: 오버레이 숨김 + 게임 재시작(shell이 canvas에 pointerdown 디스패치).
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
  const user = useCurrentUser();
  // 계정 표시명(display_name > name). 이메일은 공개 랭킹 노출 방지 위해 제외. 서버 sanitize와 동일 규칙.
  const accountName = user ? clampName(user.display_name ?? user.name ?? "") : "";
  const hasAccountName = accountName.length > 0;

  const [name, setName] = useState(accountName);
  const [editing, setEditing] = useState(!hasAccountName); // 계정명 있으면 표시+Edit, 없으면 바로 입력칸.
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [listError, setListError] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [mine, setMine] = useState<{ name: string; score: number } | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!hasAccountName) {
      // 비로그인/계정명 없음 → 직전 수동 입력 이름 복원 (계정명이 있으면 그쪽이 우선).
      try {
        const saved = localStorage.getItem(NAME_KEY);
        if (saved && !ignore) setName(saved);
      } catch {
        // ignore
      }
    }
    void fetchScores(slug).then((r) => {
      if (ignore) return;
      if (r) setScores(r);
      else setListError(true); // null = 로드 실패 → "Loading…" 고착 방지 (별도 에러 표시).
    });
    return () => {
      ignore = true;
    };
  }, [slug, hasAccountName]);

  const handleSubmit = useCallback(async () => {
    const n = name.trim();
    if (n.length < 1 || status === "submitting" || status === "submitted") return;
    setStatus("submitting");
    const ok = await submitScore(slug, n, score);
    if (!ok) {
      setStatus("error");
      return;
    }
    if (!hasAccountName) {
      // 수동 입력 이름만 기억 (계정 표시명은 device-local 익명 store에 저장하지 않음).
      try {
        localStorage.setItem(NAME_KEY, n);
      } catch {
        // ignore
      }
    }
    setMine({ name: n, score });
    setStatus("submitted");
    const fresh = await fetchScores(slug);
    if (fresh) setScores(fresh); // 재조회 실패 시 기존 목록 유지 (blank 방지).
  }, [name, score, slug, status, hasAccountName]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center backdrop-blur-[2px]">
      <p className="text-2xl font-bold uppercase tracking-[0.15em] text-rose-300">Game Over</p>
      <p className="tnum text-sm text-zinc-300">
        Score: <span className="font-semibold text-amber-300">{score}</span>
      </p>

      {status !== "submitted" ? (
        <div className="flex flex-col items-center gap-2">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              maxLength={MAX_NAME}
              placeholder="Your name"
              aria-label="Your name"
              autoFocus
              className="w-40 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-center text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          ) : (
            <p className="text-sm text-zinc-300">
              Playing as <span className="font-semibold text-zinc-100">{name}</span>{" "}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
              >
                Edit
              </button>
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "submitting" || name.trim().length < 1}
            className="rounded-md bg-amber-400 px-4 py-1 text-sm font-semibold text-zinc-900 disabled:opacity-40"
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
