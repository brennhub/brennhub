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

type Certificate = {
  commonName: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  daysRemaining: number;
  subjectAltNames: string[];
};

type CheckResult = {
  certificate: Certificate | null;
  raw: unknown;
  analysis: string | null;
  error?: string;
};

type Status = "healthy" | "warning" | "critical" | "expired";

function statusFor(days: number): Status {
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "healthy";
}

export default function SslCheckPage() {
  const t = useMessages();
  const { locale } = useLocale();
  const ts = t.sslCheck;

  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const d = domain.trim().toLowerCase();
    if (!DOMAIN_RE.test(d)) {
      setError(ts.invalidDomain);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ssl-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d, locale }),
      });
      const json = (await res.json()) as CheckResult & { error?: string };
      if (!res.ok) {
        setError(json.error ?? ts.requestFailed);
      } else if (!json.certificate && json.error) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(`${ts.networkError}: ${(err as Error).message}`);
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
          {ts.title}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {ts.description}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="domain" className="text-sm">
            {ts.domainLabel}
          </Label>
          <Input
            id="domain"
            placeholder={ts.domainPlaceholder}
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
          {loading ? ts.submitting : ts.submit}
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
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-2 h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {result?.certificate && (
        <div className="mt-8 flex flex-col gap-4">
          {result.analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{ts.cardSummary}</CardTitle>
                <CardDescription>{ts.cardSummaryDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {result.analysis}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CertificateCard cert={result.certificate} />
            <ExpiryCard cert={result.certificate} />
          </div>

          <SansCard sans={result.certificate.subjectAltNames} />

          <details className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200">
              {ts.showRaw}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-100 p-3 font-mono whitespace-pre-wrap break-all dark:bg-zinc-900">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}

function CertificateCard({ cert }: { cert: Certificate }) {
  const ts = useMessages().sslCheck;
  const { locale } = useLocale();
  const dt = locale === "ko" ? "ko-KR" : "en-US";
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(dt, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{ts.cardCertificate}</CardTitle>
        <CardDescription>{ts.cardCertificateDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <Row label={ts.commonName} value={cert.commonName} />
          <Row label={ts.issuer} value={cert.issuer} />
          <Row label={ts.notBefore} value={formatDate(cert.notBefore)} />
          <Row label={ts.notAfter} value={formatDate(cert.notAfter)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-mono text-zinc-800 break-all dark:text-zinc-200">
        {value || "—"}
      </dd>
    </div>
  );
}

function ExpiryCard({ cert }: { cert: Certificate }) {
  const ts = useMessages().sslCheck;
  const status = statusFor(cert.daysRemaining);

  const badge = {
    healthy: {
      text: ts.statusHealthy,
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    warning: {
      text: ts.statusWarning,
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    critical: {
      text: ts.statusCritical,
      cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
    expired: {
      text: ts.statusExpired,
      cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
  }[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{ts.cardExpiry}</CardTitle>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
          >
            {badge.text}
          </span>
        </div>
        <CardDescription>{ts.cardExpiryDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
            {cert.daysRemaining}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {ts.daysUnit}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SansCard({ sans }: { sans: string[] }) {
  const ts = useMessages().sslCheck;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{ts.cardSans}</CardTitle>
        <CardDescription>{ts.cardSansDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {sans.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">—</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {sans.map((name) => (
              <li
                key={name}
                className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
