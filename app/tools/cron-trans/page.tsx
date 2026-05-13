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
import { cn } from "@/lib/utils";

type Mode = "cron-to-natural" | "natural-to-cron";

type TransResult = {
  cron: string | null;
  explanation: string | null;
  nextRuns: string[];
  error?: string;
};

export default function CronTransPage() {
  const t = useMessages();
  const { locale } = useLocale();
  const tc = t.cronTrans;

  const [mode, setMode] = useState<Mode>("cron-to-natural");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransResult | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const value = input.trim();
    if (!value) {
      setError(tc.missingInput);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cron-trans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: value, locale }),
      });
      const json = (await res.json()) as TransResult & { error?: string };
      if (!res.ok) {
        setError(json.error ?? tc.requestFailed);
      } else if (json.error) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(`${tc.networkError}: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const onModeChange = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setInput("");
    setError(null);
    setResult(null);
  };

  const inputLabel =
    mode === "cron-to-natural" ? tc.inputLabelCron : tc.inputLabelNatural;
  const placeholder =
    mode === "cron-to-natural"
      ? tc.inputPlaceholderCron
      : tc.inputPlaceholderNatural;

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
          {tc.title}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {tc.description}
        </p>
      </header>

      <div className="mt-8">
        <div
          className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
          role="group"
          aria-label={tc.modeToggleHint}
        >
          {(["cron-to-natural", "natural-to-cron"] as const).map((m) => {
            const active = m === mode;
            const label =
              m === "cron-to-natural"
                ? tc.modeCronToNatural
                : tc.modeNaturalToCron;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                aria-pressed={active}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="cron-input" className="text-sm">
            {inputLabel}
          </Label>
          <Input
            id="cron-input"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={loading}
            className="mt-1 font-mono"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? tc.submitting : tc.submit}
        </Button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-8 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {result && result.cron && (
        <div className="mt-8 flex flex-col gap-4">
          <CronCard cron={result.cron} />
          {result.explanation && (
            <ExplanationCard text={result.explanation} />
          )}
          {result.nextRuns.length > 0 && (
            <NextRunsCard runs={result.nextRuns} />
          )}
        </div>
      )}
    </main>
  );
}

function CronCard({ cron }: { cron: string }) {
  const tc = useMessages().cronTrans;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(cron);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard API may be unavailable
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{tc.resultCronLabel}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="h-7 px-2 text-xs"
          >
            {copied ? tc.copied : tc.copy}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md bg-zinc-100 p-3 font-mono text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
          {cron}
        </pre>
      </CardContent>
    </Card>
  );
}

function ExplanationCard({ text }: { text: string }) {
  const tc = useMessages().cronTrans;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{tc.resultExplanationLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

function NextRunsCard({ runs }: { runs: string[] }) {
  const tc = useMessages().cronTrans;
  const { locale } = useLocale();
  const dtLocale = locale === "ko" ? "ko-KR" : "en-US";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{tc.nextRunsLabel}</CardTitle>
        <CardDescription>
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {runs.map((iso) => (
            <li key={iso} className="font-mono">
              {new Date(iso).toLocaleString(dtLocale, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                weekday: "short",
              })}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
