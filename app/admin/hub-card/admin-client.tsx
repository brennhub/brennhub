"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Hub 카드 전역 설정 편집 (singleton).
 * 실시간 미리보기 카드 1개 — slider 변경 시 즉시 반영.
 * 저장 button 누르면 D1에 INSERT OR REPLACE (id=1).
 */

const LINES_MIN = 2;
const LINES_MAX = 8;
const PB_MIN = 16;
const PB_MAX = 96;

const LINE_CLAMP_CLASS: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
  7: "line-clamp-7",
  8: "line-clamp-8",
};

const SAMPLE_KO = {
  name: "샘플 도구",
  description:
    "도구의 한국어 설명입니다. 길어지면 줄임표로 잘립니다. 카드 디자인을 미리 확인하실 수 있도록 일정 길이의 더미 텍스트가 들어 있습니다. 한 줄 더 보이게 하고 싶다면 description lines를 늘리시면 됩니다.",
};

export function HubCardAdminClient() {
  const [lines, setLines] = useState(3);
  const [pb, setPb] = useState(40);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/hub-card-settings", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          setError(`불러오기 실패 (${res.status})`);
          setLoading(false);
          return;
        }
        const body = (await res.json()) as {
          description_lines: number;
          padding_bottom: number;
        };
        if (!cancelled) {
          setLines(body.description_lines);
          setPb(body.padding_bottom);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hub-card-settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description_lines: lines,
          padding_bottom: pb,
        }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
      } else {
        setError(`저장 실패 (${res.status})`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [lines, pb]);

  if (loading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">불러오는 중…</p>;
  }
  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  const clampClass = LINE_CLAMP_CLASS[lines] ?? "line-clamp-3";

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hub 카드 전역 설정
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          메인 페이지 모든 카드에 동시 적용. 미리보기로 확인 후 저장하세요.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 좌측: 설정 */}
        <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="lines"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                설명 줄 수 (line-clamp)
              </label>
              <span className="tnum text-sm text-zinc-700 dark:text-zinc-300">
                {lines}
              </span>
            </div>
            <input
              id="lines"
              type="range"
              min={LINES_MIN}
              max={LINES_MAX}
              step={1}
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              많을수록 설명이 길게 보이지만 카드 세로 길이도 늘어납니다.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pb"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                본문 하단 여백 (px)
              </label>
              <span className="tnum text-sm text-zinc-700 dark:text-zinc-300">
                {pb}px
              </span>
            </div>
            <input
              id="pb"
              type="range"
              min={PB_MIN}
              max={PB_MAX}
              step={2}
              value={pb}
              onChange={(e) => setPb(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              설명과 카드 하단(방문수·피드백) 사이의 공백. 줄이면 설명이
              하단에 더 가까워집니다.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            {savedAt && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                저장됨
              </span>
            )}
          </div>
        </div>

        {/* 우측: 미리보기 */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            미리보기
          </p>
          <div className="relative block h-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div
              className="flex items-start gap-3 pr-20"
              style={{ paddingBottom: `${pb}px` }}
            >
              <Sparkles
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  {SAMPLE_KO.name}
                </h3>
                <p
                  className={`mt-1 ${clampClass} text-sm text-zinc-600 dark:text-zinc-400`}
                >
                  {SAMPLE_KO.description}
                </p>
              </div>
            </div>
            <div className="absolute bottom-3 left-6 text-xs text-zinc-500 dark:text-zinc-400">
              👁 12
            </div>
            <span className="absolute bottom-3 right-3 text-xs text-zinc-400 dark:text-zinc-500">
              💬
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
