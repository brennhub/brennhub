"use client";

import { useState, type FormEvent } from "react";
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
import type {
  HanjaEntry,
  NameCandidate,
} from "@/app/tools/saju-naming/lib/names";

interface Props {
  /** 1단계 사주 결과의 용신 (자원오행 추천 기준). */
  yongsin: string[];
  /** 1단계 사주 결과의 기신 (점수 페널티 기준). */
  gisin: string[];
}

const ERR_BOX =
  "mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300";

export function NameRecommendSection({ yongsin, gisin }: Props) {
  const [surname, setSurname] = useState("");
  const [hanjaResults, setHanjaResults] = useState<HanjaEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<HanjaEntry | null>(null);
  const [nameLength, setNameLength] = useState<1 | 2>(2);
  const [candidates, setCandidates] = useState<NameCandidate[] | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [recommendErr, setRecommendErr] = useState<string | null>(null);

  async function searchHanja(e: FormEvent) {
    e.preventDefault();
    const q = surname.trim();
    if (!q) {
      setSearchErr("성씨 한글을 입력하세요.");
      return;
    }
    setSearching(true);
    setSearchErr(null);
    setHanjaResults(null);
    setSelected(null);
    setCandidates(null);
    setRecommendErr(null);
    try {
      const res = await fetch(
        `/api/saju-naming/hanja-search?hangeul=${encodeURIComponent(q)}&limit=24`,
      );
      const json = (await res.json()) as
        | { results: HanjaEntry[]; total: number }
        | { error?: string };
      if (!res.ok) {
        setSearchErr(
          ("error" in json && json.error) || "한자 검색에 실패했습니다.",
        );
      } else if (!("results" in json) || json.results.length === 0) {
        setSearchErr(`'${q}'에 해당하는 한자가 없습니다.`);
      } else {
        setHanjaResults(json.results);
      }
    } catch (e2) {
      setSearchErr(`네트워크 오류: ${(e2 as Error).message}`);
    } finally {
      setSearching(false);
    }
  }

  function pickHanja(h: HanjaEntry) {
    setSelected(h);
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
          sungHanja: selected.character,
          sungStroke: selected.won_stroke,
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
          <form
            onSubmit={searchHanja}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Label htmlFor="surname" className="text-sm">
                성씨 (한글)
              </Label>
              <Input
                id="surname"
                placeholder="예: 김"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                disabled={searching}
                className="mt-1"
              />
            </div>
            <Button type="submit" variant="outline" disabled={searching}>
              {searching ? "검색 중…" : "한자 찾기"}
            </Button>
          </form>

          {searchErr && <div className={ERR_BOX}>{searchErr}</div>}

          {hanjaResults && (
            <div className="mt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                성씨 한자를 선택하세요
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {hanjaResults.map((h) => {
                  const active = selected?.character === h.character;
                  return (
                    <button
                      key={h.character}
                      type="button"
                      onClick={() => pickHanja(h)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600",
                      )}
                    >
                      <span className="text-base font-semibold">
                        {h.character}
                      </span>
                      {h.meaning && (
                        <span
                          className={cn(
                            "text-xs",
                            active
                              ? "text-zinc-300 dark:text-zinc-600"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {h.meaning}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
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
                surname={selected?.character ?? ""}
                surnameHangeul={surname.trim()}
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
              추천 후보를 찾지 못했습니다. 성씨 한자나 이름 글자 수를 바꿔
              다시 시도해 보세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CandidateCard({
  surname,
  surnameHangeul,
  candidate,
  rank,
}: {
  surname: string;
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
          {surname}
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
