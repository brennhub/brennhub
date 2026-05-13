"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

type LookupResult = {
  found: boolean;
  value: unknown;
  raw: string;
  error?: string;
};
type DiagResult = {
  mx: LookupResult;
  spf: LookupResult;
  dmarc: LookupResult;
  ptr: LookupResult;
  analysis: string | null;
};

export default function EmailDiagPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagResult | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const d = domain.trim().toLowerCase();
    if (!DOMAIN_RE.test(d)) {
      setError("유효한 도메인 형식이 아닙니다 (예: example.com).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/email-diag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const json = (await res.json()) as Partial<DiagResult> & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "진단 요청에 실패했습니다.");
      } else {
        setResult(json as DiagResult);
      }
    } catch (err) {
      setError(`네트워크 오류: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← brennhub
        </Link>
        <header className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            이메일 발송 진단기
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            도메인의 MX / SPF / DMARC / PTR 설정을 빠르게 확인합니다.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="domain" className="text-sm">
              도메인
            </Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={loading}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "진단 중..." : "진단하기"}
          </Button>
        </form>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {result?.analysis && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">AI 진단</CardTitle>
              <CardDescription>
                MX / SPF / DMARC / PTR 결과를 종합한 해설
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                {result.analysis}
              </p>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResultCard
              title="MX"
              subtitle="메일 수신 서버"
              result={result.mx}
            />
            <ResultCard
              title="SPF"
              subtitle="발송 허용 IP 정책"
              result={result.spf}
            />
            <ResultCard
              title="DMARC"
              subtitle="인증 실패 처리 정책"
              result={result.dmarc}
            />
            <ResultCard
              title="PTR"
              subtitle="MX 호스트 역방향 DNS"
              result={result.ptr}
            />
          </div>
        )}

        {result && (
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            v0 — DNS 원시 결과만 표시합니다. AI 해석은 Phase 2에서 추가됩니다.
          </p>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  title,
  subtitle,
  result,
}: {
  title: string;
  subtitle: string;
  result: LookupResult;
}) {
  const status: "ok" | "missing" | "error" = result.error
    ? "error"
    : result.found
      ? "ok"
      : "missing";
  const badge =
    status === "ok"
      ? {
          text: "확인됨",
          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        }
      : status === "missing"
        ? {
            text: "없음",
            cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          }
        : {
            text: "오류",
            cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
          >
            {badge.text}
          </span>
        </div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "error" ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {result.error}
          </p>
        ) : (
          <pre className="max-h-48 overflow-auto rounded-md bg-zinc-100 p-3 font-mono text-xs whitespace-pre-wrap break-all text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {status === "ok"
              ? JSON.stringify(result.value, null, 2)
              : "결과 없음"}
          </pre>
        )}
        <details className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200">
            원시 응답 보기
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-zinc-100 p-3 font-mono whitespace-pre-wrap break-all dark:bg-zinc-900">
            {result.raw}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
