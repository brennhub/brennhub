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
import { useLocale, useMessages } from "@/lib/i18n/provider";

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
  const t = useMessages();
  const { locale } = useLocale();
  const td = t.emailDiag;

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
      setError(td.invalidDomain);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/email-diag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d, locale }),
      });
      const json = (await res.json()) as Partial<DiagResult> & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? td.requestFailed);
      } else {
        setResult(json as DiagResult);
      }
    } catch (err) {
      setError(`${td.networkError}: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t.toolCommon.back}
      </Link>
      <header className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {td.title}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {td.description}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="domain" className="text-sm">
            {td.domainLabel}
          </Label>
          <Input
            id="domain"
            placeholder={td.domainPlaceholder}
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
          {loading ? td.submitting : td.submit}
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
            <CardTitle className="text-lg">{td.cardSummary}</CardTitle>
            <CardDescription>{td.cardSummaryDesc}</CardDescription>
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
            subtitle={td.cardMxDesc}
            result={result.mx}
          />
          <ResultCard
            title="SPF"
            subtitle={td.cardSpfDesc}
            result={result.spf}
          />
          <ResultCard
            title="DMARC"
            subtitle={td.cardDmarcDesc}
            result={result.dmarc}
          />
          <ResultCard
            title="PTR"
            subtitle={td.cardPtrDesc}
            result={result.ptr}
          />
        </div>
      )}

      {result && (
        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          {td.footer}
        </p>
      )}
    </main>
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
  const td = useMessages().emailDiag;
  const status: "ok" | "missing" | "error" = result.error
    ? "error"
    : result.found
      ? "ok"
      : "missing";
  const badge =
    status === "ok"
      ? {
          text: td.found,
          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        }
      : status === "missing"
        ? {
            text: td.missing,
            cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          }
        : {
            text: td.error,
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
              : td.noResult}
          </pre>
        )}
        <details className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200">
            {td.showRaw}
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-zinc-100 p-3 font-mono whitespace-pre-wrap break-all dark:bg-zinc-900">
            {result.raw}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
