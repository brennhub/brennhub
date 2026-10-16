"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Pin } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useBankBonusMessages, type BankBonusMessages } from "@/lib/bank-bonus/messages";
import type { AccountType, FreshnessRow, OfferRow } from "@/lib/bank-bonus/types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/switch";
import { cn } from "@/lib/utils";

/**
 * 한 페이지 레이아웃 — 위: 소스 신선도 / 아래: 보너스 목록 (필터 → /api/admin/bank-bonus/offers).
 * 시각은 서버·브라우저 시간대 차이로 hydration이 어긋나지 않게 UTC 문자열 그대로 자른다.
 */

type Props = { freshness: FreshnessRow[] | null; loadError: string | null };

const TYPES: AccountType[] = ["checking", "savings", "business", "unknown"];

const utc = (iso: string | null) => (iso ? `${iso.slice(0, 16).replace("T", " ")} UTC` : null);
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export function BankBonusClientShell({ freshness, loadError }: Props) {
  const tool = useMessages().tools["bank-bonus"];
  const t = useBankBonusMessages();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{tool?.name}</h1>
        <p className="mt-3 text-muted-foreground">{tool?.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.adminNote}</p>
      </header>
      <FreshnessStrip t={t} rows={freshness} loadError={loadError} />
      <Offers t={t} />
    </main>
  );
}

function FreshnessStrip({ t, rows, loadError }: { t: BankBonusMessages; rows: FreshnessRow[] | null; loadError: string | null }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{t.freshness}</h2>
      {loadError ? (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t.loadFailed}: {loadError}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows?.map((r) => (
            <li key={r.id} className={cn("rounded-lg border border-border bg-card p-3 text-sm", !r.enabled && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{r.name}</span>
                {!r.enabled && <Badge>{t.disabled}</Badge>}
                {r.enabled && r.stale ? <Badge tone="warn">{t.stale}</Badge> : null}
              </div>
              {r.last_fetch_at ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  <Field label={t.lastFetch} value={utc(r.last_fetch_at)} />
                  <Field label={t.httpStatus} value={r.http_status} />
                  <Field label={t.lastModified} value={r.last_modified} />
                  <Field label={t.age} value={r.age_seconds != null ? `${r.age_seconds}s` : null} />
                  <Field label={t.asOf} value={r.source_as_of} />
                  <Field label={t.itemsNew} value={r.items_new != null ? `${r.items_new} / ${r.items_found ?? 0}` : null} />
                  {r.error && <Field label={t.error} value={r.error} danger />}
                </dl>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{t.noRuns}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({ label, value, danger }: { label: string; value: string | number | null; danger?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 break-words", danger ? "text-destructive" : "text-foreground")}>{value ?? "—"}</dd>
    </>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; offers: OfferRow[] };

function Offers({ t }: { t: BankBonusMessages }) {
  const [type, setType] = useState<AccountType | "">("");
  const [caOnly, setCaOnly] = useState(true);
  const [minBonus, setMinBonus] = useState("300");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const q = new URLSearchParams({ sort });
    if (type) q.set("type", type);
    if (caOnly) q.set("caEligible", "1");
    if (minBonus.trim() && Number.isFinite(Number(minBonus))) q.set("minBonus", minBonus.trim());
    const timer = setTimeout(() => {
      setState({ kind: "loading" });
      fetch(`/api/admin/bank-bonus/offers?${q}`, { signal: ctrl.signal, cache: "no-store" })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as { offers?: OfferRow[]; error?: string } | null;
          if (!res.ok || !data?.offers) throw new Error(data?.error ?? `HTTP ${res.status}`);
          setState({ kind: "ok", offers: data.offers });
        })
        .catch((e: unknown) => {
          if (!ctrl.signal.aborted) setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [type, caOnly, minBonus, sort]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t.type}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccountType | "")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            <option value="">{t.all}</option>
            {TYPES.map((v) => (
              <option key={v} value={v}>
                {t.types[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t.minBonus}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={minBonus}
            onChange={(e) => setMinBonus(e.target.value)}
            className="h-9 w-28"
          />
        </label>
        <div className="flex h-9 items-center gap-2 text-sm text-foreground">
          <Switch checked={caOnly} onCheckedChange={setCaOnly} />
          <span>{t.caOnly}</span>
        </div>
        <button
          type="button"
          onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-foreground hover:bg-muted"
        >
          <ArrowDownUp className="size-4" aria-hidden />
          {sort === "desc" ? t.sortDesc : t.sortAsc}
        </button>
        {state.kind === "ok" && <span className="h-9 content-center text-xs text-muted-foreground">{t.count(state.offers.length)}</span>}
      </div>

      <div className="mt-4">
        {state.kind === "loading" && <p className="text-sm text-muted-foreground">{t.loading}</p>}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">
            {t.loadFailed}: {state.message}
          </p>
        )}
        {state.kind === "ok" && state.offers.length === 0 && <p className="text-sm text-muted-foreground">{t.empty}</p>}
        {state.kind === "ok" && state.offers.length > 0 && (
          <>
            <OfferCards t={t} offers={state.offers} />
            <OfferTable t={t} offers={state.offers} />
          </>
        )}
      </div>
    </section>
  );
}

function statesLabel(t: BankBonusMessages, o: OfferRow) {
  if (o.state_text) return o.state_text;
  return o.nationwide === 1 ? t.nationwide : t.statesUnknown;
}

function bonusLabel(o: OfferRow) {
  return o.bonus_text ?? (o.bonus_max != null ? `$${o.bonus_max.toLocaleString("en-US")}` : "—");
}

function BankCell({ t, o }: { t: BankBonusMessages; o: OfferRow }) {
  const name = o.bank ?? o.title ?? "—";
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        {o.detail_url ? (
          <a href={o.detail_url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-2 hover:underline">
            {name}
          </a>
        ) : (
          <span className="font-medium text-foreground">{name}</span>
        )}
        {o.pinned === 1 && (
          <Badge>
            <Pin className="size-3" aria-hidden />
            {t.pinned}
          </Badge>
        )}
      </div>
      {o.bank && o.title && <div className="mt-0.5 text-xs text-muted-foreground">{o.title}</div>}
    </div>
  );
}

/** 폰: 카드 목록. */
function OfferCards({ t, offers }: { t: BankBonusMessages; offers: OfferRow[] }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
      {offers.map((o) => (
        <li key={o.id} className="p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <BankCell t={t} o={o} />
            <span className="shrink-0 font-semibold text-foreground">{bonusLabel(o)}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <Field label={t.col.type} value={t.types[o.account_type] ?? o.account_type} />
            <Field label={t.col.states} value={statesLabel(t, o)} />
            <Field label={t.col.dd} value={o.dd_text} />
            <Field label={t.col.pull} value={o.pull_text} />
            <Field label={t.col.cc} value={o.cc_funding_text} />
            <Field label={t.col.source} value={o.source_name} />
            <Field label={t.col.firstSeen} value={day(o.first_seen_at)} />
            <Field label={t.col.lastSeen} value={day(o.last_seen_at)} />
            <Field label={t.col.status} value={t.statuses[o.status] ?? o.status} />
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** 태블릿·데스크톱: 표. */
function OfferTable({ t, offers }: { t: BankBonusMessages; offers: OfferRow[] }) {
  const cols = [t.col.bank, t.col.type, t.col.bonus, t.col.states, t.col.dd, t.col.pull, t.col.cc, t.col.source, t.col.firstSeen, t.col.lastSeen, t.col.status];
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card align-top">
          {offers.map((o) => (
            <tr key={o.id}>
              <td className="max-w-64 px-3 py-2">
                <BankCell t={t} o={o} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{t.types[o.account_type] ?? o.account_type}</td>
              <td className="px-3 py-2 font-semibold whitespace-nowrap text-foreground">{bonusLabel(o)}</td>
              <td className="max-w-40 px-3 py-2">{statesLabel(t, o)}</td>
              <td className="max-w-48 px-3 py-2">{o.dd_text ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.pull_text ?? "—"}</td>
              <td className="max-w-40 px-3 py-2">{o.cc_funding_text ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.source_name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{day(o.first_seen_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{day(o.last_seen_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{t.statuses[o.status] ?? o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
