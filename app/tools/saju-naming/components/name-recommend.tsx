"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NameCandidate } from "@/app/tools/saju-naming/lib/names";
import {
  SURNAMES,
  type SurnameOption,
} from "@/app/tools/saju-naming/lib/surnames";

interface Props {
  /** 1단계 사주 결과의 용신 (자원오행 추천 기준). */
  yongsin: string[];
  /** 1단계 사주 결과의 기신 (점수 페널티 기준). */
  gisin: string[];
}

const ERR_BOX =
  "mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";

/** 빈 입력 시 보여줄 자주 쓰는 성씨 수 (인구순 상위). */
const QUICK_PICK = 12;

export function NameRecommendSection({ yongsin, gisin }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SurnameOption | null>(null);
  const [nameLength, setNameLength] = useState<1 | 2>(2);
  const [candidates, setCandidates] = useState<NameCandidate[] | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [recommendErr, setRecommendErr] = useState<string | null>(null);

  const q = query.trim();
  const matches = useMemo(
    () =>
      q
        ? SURNAMES.filter((s) => s.hangeul.startsWith(q))
        : SURNAMES.slice(0, QUICK_PICK),
    [q],
  );

  function pickSurname(s: SurnameOption) {
    setSelected(s);
    setCandidates(null);
    setRecommendErr(null);
  }

  function changeNameLength(n: 1 | 2) {
    setNameLength(n);
    setCandidates(null);
    setRecommendErr(null);
  }

  async function getRecommend() {
    if (!selected) return;
    setRecommending(true);
    setRecommendErr(null);
    setCandidates(null);
    try {
      const res = await fetch("/api/saju-naming/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sungHanja: selected.hanja,
          sungStroke: selected.wonStroke,
          yongsin,
          gisin,
          nameLength,
          topN: 3,
        }),
      });
      const json = (await res.json()) as
        | { candidates: NameCandidate[] }
        | { error?: string };
      if (!res.ok) {
        setRecommendErr(
          ("error" in json && json.error) || "이름 추천에 실패했습니다.",
        );
      } else {
        setCandidates(("candidates" in json && json.candidates) || []);
      }
    } catch (e) {
      setRecommendErr(`네트워크 오류: ${(e as Error).message}`);
    } finally {
      setRecommending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">성씨 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="surname" className="text-sm">
              성씨 (한글)
            </Label>
            <Input
              id="surname"
              placeholder="예: 김"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1"
            />
          </div>

          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {q ? "검색 결과" : "자주 쓰는 성씨"}
          </p>
          {matches.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {matches.map((s) => {
                const active =
                  selected?.hangeul === s.hangeul &&
                  selected?.hanja === s.hanja;
                return (
                  <button
                    key={`${s.hangeul}-${s.hanja}`}
                    type="button"
                    onClick={() => pickSurname(s)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <span className="text-base font-semibold">{s.hanja}</span>
                    <span
                      className={cn(
                        "text-xs",
                        active
                          ? "text-zinc-300 dark:text-zinc-600"
                          : "text-zinc-500 dark:text-zinc-400",
                      )}
                    >
                      {s.hangeul}
                      {s.meaning ? ` · ${s.meaning}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              목록에 없는 성씨입니다. 다른 성씨로 시도해 보세요.
            </p>
          )}

          {selected && (
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  이름 글자 수
                </span>
                <div
                  className="mt-1 inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
                  role="group"
                  aria-label="이름 글자 수 선택"
                >
                  {([2, 1] as const).map((n) => {
                    const active = n === nameLength;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => changeNameLength(n)}
                        aria-pressed={active}
                        disabled={recommending}
                        className={cn(
                          "rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                          active
                            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                        )}
                      >
                        {n === 2 ? "두 글자" : "외자"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                type="button"
                onClick={getRecommend}
                disabled={recommending}
              >
                {recommending ? "추천 중…" : "이름 추천 받기"}
              </Button>
            </div>
          )}

          {recommendErr && <div className={ERR_BOX}>{recommendErr}</div>}
        </CardContent>
      </Card>

      {candidates && candidates.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {candidates.map((c, i) => (
              <CandidateCard
                key={`${c.hanja}-${i}`}
                surnameHanja={selected?.hanja ?? ""}
                surnameHangeul={selected?.hangeul ?? ""}
                candidate={c}
                rank={i + 1}
              />
            ))}
          </div>
          <UpgradeCta />
        </>
      )}

      {candidates && candidates.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              추천 후보를 찾지 못했습니다. 성씨나 이름 글자 수를 바꿔 다시
              시도해 보세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CandidateCard({
  surnameHanja,
  surnameHangeul,
  candidate,
  rank,
}: {
  surnameHanja: string;
  surnameHangeul: string;
  candidate: NameCandidate;
  rank: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          후보 {rank}
        </span>
        <span className="mt-1 text-2xl font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
          {surnameHanja}
          {candidate.hanja}
        </span>
        <span className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {surnameHangeul}
          {candidate.hangeul}
        </span>
        <span className="mt-3 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {candidate.totalScore}점
        </span>
        <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {candidate.breakdown}
        </span>
      </CardContent>
    </Card>
  );
}

function UpgradeCta() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        더 많은 이름이 궁금하세요?
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Basic으로 이 사주에 맞는 이름 후보 30개를 모두 받아보세요.
      </p>
      <Button type="button" disabled className="mt-3">
        준비 중
      </Button>
    </div>
  );
}
