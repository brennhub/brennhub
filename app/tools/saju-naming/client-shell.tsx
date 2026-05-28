"use client";

import { useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import type { Pillar } from "@/app/tools/saju-naming/lib/saju";
import type { OhaengAnalysis } from "@/app/tools/saju-naming/lib/ohaeng";
import { SajuInputForm, type SajuFormValues } from "./components/saju-input-form";
import { SajuResultView } from "./components/saju-result";
import { NameRecommendSection } from "./components/name-recommend";

/**
 * `/api/saju-naming/saju` 응답 형태.
 * `saju`는 라우트의 `toApiSaju` — SajuResult 중 4기둥 + lunarDate (오행은 `ohaeng` 필드).
 */
export interface SajuApiResponse {
  saju: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
    lunarDate: {
      year: number;
      month: number;
      day: number;
      intercalation: boolean;
    };
  };
  ohaeng: OhaengAnalysis;
}

export function SajuNamingClientShell() {
  const t = useMessages();

  const [result, setResult] = useState<SajuApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: SajuFormValues) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/saju-naming/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as
        | SajuApiResponse
        | { error?: string };
      if (!res.ok) {
        setError(
          ("error" in json && json.error) || "사주 계산에 실패했습니다.",
        );
      } else {
        setResult(json as SajuApiResponse);
      }
    } catch (e) {
      setError(`네트워크 오류: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t.toolCommon.back}
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.sajuNaming.name}
          </h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            무료 미리보기
          </span>
        </div>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          생년월일시로 사주팔자와 오행 균형을 분석합니다.
        </p>
      </header>

      <SajuInputForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {result && <SajuResultView data={result} />}

      {result && (
        <NameRecommendSection
          yongsin={result.ohaeng.yongsin}
          gisin={result.ohaeng.gisin}
        />
      )}
    </main>
  );
}
