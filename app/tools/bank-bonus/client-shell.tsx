"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Pin, Star } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { useBankBonusMessages, type BankBonusMessages } from "@/lib/bank-bonus/messages";
import { headlineReason } from "@/lib/bank-bonus/score";
import type { OffersResponse } from "@/lib/bank-bonus/offers";
import type { AccountType, FreshnessRow, Localized, OfferFlags, PostRow, ScoredOffer } from "@/lib/bank-bonus/types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/switch";
import { cn } from "@/lib/utils";

/**
 * 한 페이지, 위에서 아래로: 신선도 한 줄 → 숫자 3개 → 추천 Top 5 → 전체 표(폰은 카드) → 최근 글.
 * 상대 시간은 서버가 넘긴 nowMs 기준 (hydration 일치).
 */

type Props = { freshness: FreshnessRow[] | null; loadError: string | null; nowMs: number };
type FlagName = "star" | "hidden" | "applied";

const TYPE_OPTIONS: AccountType[] = ["checking", "savings", "business", "unknown"];
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Query = {
  types: AccountType[];
  minBonus: string;
  caOnly: boolean;
  excludeExisting: boolean;
  excludeHold: boolean;
  excludeBranch: boolean;
  excludeHardPull: boolean;
  includeHidden: boolean;
  sort: "score" | "bonus" | "expires";
};

const INITIAL_QUERY: Query = {
  types: ["checking", "savings"],
  minBonus: "300",
  caOnly: true,
  excludeExisting: true,
  excludeHold: false,
  excludeBranch: false,
  excludeHardPull: false,
  includeHidden: false,
  sort: "score",
};

function toSearch(q: Query): string {
  const b = (v: boolean) => (v ? "1" : "0");
  // 기본값에 기대지 않고 전부 명시 — CA 토글 등 화면 상태가 곧 요청.
  return new URLSearchParams({
    types: q.types.join(","),
    minBonus: q.minBonus.trim(),
    caOnly: b(q.caOnly),
    excludeExisting: b(q.excludeExisting),
    excludeHold: b(q.excludeHold),
    excludeBranch: b(q.excludeBranch),
    excludeHardPull: b(q.excludeHardPull),
    includeHidden: b(q.includeHidden),
    sort: q.sort,
  }).toString();
}

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; data: OffersResponse };

export function BankBonusClientShell({ freshness, loadError, nowMs }: Props) {
  const tool = useMessages().tools["bank-bonus"];
  const t = useBankBonusMessages();
  const { locale } = useLocale();
  const L = (x: Localized) => x[locale];

  const [query, setQuery] = useState<Query>(INITIAL_QUERY);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadTick, setReloadTick] = useState(0);
  const [flagError, setFlagError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/admin/bank-bonus/offers?${toSearch(query)}`, { signal: ctrl.signal, cache: "no-store" })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as (OffersResponse & { error?: string }) | null;
          if (!res.ok || !data?.offers) throw new Error(data?.error ?? `HTTP ${res.status}`);
          setState({ kind: "ok", data });
        })
        .catch((e: unknown) => {
          if (!ctrl.signal.aborted) setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, reloadTick]);

  const patch = useCallback((p: Partial<Query>) => setQuery((q) => ({ ...q, ...p })), []);

  // 낙관적 반영 → POST → 조용히 다시 불러와 요약·Top 5 정합.
  const setFlag = useCallback(async (key: string, flag: FlagName, value: 0 | 1) => {
    setFlagError(null);
    setState((s) => {
      if (s.kind !== "ok") return s;
      const upd = (o: ScoredOffer) => (o.key === key ? { ...o, flags: { ...o.flags, [flag]: value } as OfferFlags } : o);
      return { kind: "ok", data: { ...s.data, offers: s.data.offers.map(upd), top: s.data.top.map(upd) } };
    });
    try {
      const res = await fetch("/api/admin/bank-bonus/flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ offer_key: key, [flag]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setFlagError(e instanceof Error ? e.message : String(e));
    }
    setReloadTick((n) => n + 1);
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{tool?.name}</h1>
        <p className="mt-2 text-muted-foreground">{tool?.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.adminNote}</p>
      </header>

      <Freshness t={t} rows={freshness} loadError={loadError} nowMs={nowMs} />

      {state.kind === "error" && (
        <p className="mt-6 text-sm text-destructive">
          {t.loadFailed}: {state.message}
        </p>
      )}
      {flagError && (
        <p className="mt-3 text-sm text-destructive">
          {t.flagFailed}: {flagError}
        </p>
      )}

      <Stats t={t} data={state.kind === "ok" ? state.data : null} />
      <TopPicks t={t} L={L} data={state.kind === "ok" ? state.data : null} onFlag={setFlag} />

      <section className="mt-10">
        <Controls t={t} query={query} patch={patch} />
        <div className="mt-4">
          {state.kind === "loading" && <p className="text-sm text-muted-foreground">{t.loading}</p>}
          {state.kind === "ok" && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">{t.count(state.data.offers.length)}</p>
              {state.data.offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.empty}</p>
              ) : (
                <>
                  <OfferCards t={t} L={L} offers={state.data.offers} onFlag={setFlag} />
                  <OfferTable t={t} L={L} offers={state.data.offers} onFlag={setFlag} />
                </>
              )}
            </>
          )}
        </div>
      </section>

      <RecentPosts t={t} nowMs={nowMs} />
    </main>
  );
}

function Freshness({ t, rows, loadError, nowMs }: { t: BankBonusMessages; rows: FreshnessRow[] | null; loadError: string | null; nowMs: number }) {
  if (loadError) {
    return (
      <p className="mt-6 text-sm text-destructive">
        {t.loadFailed}: {loadError}
      </p>
    );
  }
  return (
    <ul className="mt-6 space-y-1 text-xs text-muted-foreground">
      {rows?.map((r) => (
        <li key={r.id} className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", !r.enabled && "opacity-60")}>
          <span className="font-medium text-foreground">{r.name}</span>
          <span>·</span>
          <span title={r.last_fetch_at ?? undefined}>
            {r.last_fetch_at ? t.ago(Math.max(0, Math.floor((nowMs - Date.parse(r.last_fetch_at)) / 60_000))) : t.never}
          </span>
          {r.source_as_of && (
            <>
              <span>·</span>
              <span>{r.source_as_of}</span>
            </>
          )}
          {!r.enabled ? <Chip>{t.disabled}</Chip> : r.stale ? <Chip tone="warn">{t.stale}</Chip> : null}
          {r.enabled && r.error ? <span className="text-destructive">{r.error}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Stats({ t, data }: { t: BankBonusMessages; data: OffersResponse | null }) {
  const items = [
    [t.stats.recommended, data?.summary.recommended],
    [t.stats.expiringSoon, data?.summary.expiringSoon],
    [t.stats.newThisWeek, data?.summary.newThisWeek],
  ] as const;
  return (
    <dl className="mt-6 grid grid-cols-3 gap-3">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-lg border border-border bg-card px-3 py-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {n ?? "—"}
            {n != null && t.stats.unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{t.stats.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ddLine(t: BankBonusMessages, o: ScoredOffer) {
  if (o.ddRequired === 0) return t.ddNone;
  if (o.ddRequired === 1) return t.dd(o.ddAmount != null ? usd(o.ddAmount) : null, o.ddDays);
  return t.ddUnknown;
}

const bonusLabel = (o: ScoredOffer) => o.bonusText ?? (o.bonusMax != null ? usd(o.bonusMax) : "—");

type FlagFn = (key: string, flag: FlagName, value: 0 | 1) => void;
type LFn = (x: Localized) => string;

function TopPicks({ t, L, data, onFlag }: { t: BankBonusMessages; L: LFn; data: OffersResponse | null; onFlag: FlagFn }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{t.top}</h2>
      {data && data.top.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t.topEmpty}</p>}
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.top.map((o, i) => (
          <li key={o.key} className="flex flex-col rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
                <h3 className="font-semibold text-foreground">
                  {o.detailUrl ? (
                    <a href={o.detailUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                      {o.bank ?? o.title}
                    </a>
                  ) : (
                    (o.bank ?? o.title)
                  )}
                </h3>
              </div>
              <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{bonusLabel(o)}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{ddLine(t, o)}</p>
            <p className="text-xs text-muted-foreground">
              {o.expiresOn ? `${t.expires} ${o.expiresOn}` : t.noExpiry}
            </p>
            <p className="mt-2 text-xs text-muted-foreground" title={o.reasons.map(L).join("\n")}>
              {t.score} {o.score} · {L(headlineReason(o))}
            </p>
            <Tags L={L} o={o} className="mt-2" />
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <FlagButton active={!!o.flags.star} onClick={() => onFlag(o.key, "star", o.flags.star ? 0 : 1)}>
                {t.actions.star}
              </FlagButton>
              <FlagButton active={!!o.flags.hidden} onClick={() => onFlag(o.key, "hidden", o.flags.hidden ? 0 : 1)}>
                {t.actions.hidden}
              </FlagButton>
              <FlagButton active={!!o.flags.applied} onClick={() => onFlag(o.key, "applied", o.flags.applied ? 0 : 1)}>
                {t.actions.applied}
              </FlagButton>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FlagButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border px-2.5 text-xs transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Tags({ L, o, className }: { L: LFn; o: ScoredOffer; className?: string }) {
  if (!o.tags.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {o.tags.map((tag) => (
        <Chip key={tag.code} tone={tag.code === "expiring" || tag.code === "hold" ? "warn" : undefined}>
          {L(tag)}
        </Chip>
      ))}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Controls({ t, query, patch }: { t: BankBonusMessages; query: Query; patch: (p: Partial<Query>) => void }) {
  type ToggleKey = "caOnly" | "excludeExisting" | "excludeHold" | "excludeBranch" | "excludeHardPull" | "includeHidden";
  const toggles: [ToggleKey, string][] = [
    ["caOnly", t.filters.caOnly],
    ["excludeExisting", t.filters.excludeExisting],
    ["excludeHold", t.filters.excludeHold],
    ["excludeBranch", t.filters.excludeBranch],
    ["excludeHardPull", t.filters.excludeHardPull],
    ["includeHidden", t.filters.includeHidden],
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs text-muted-foreground">{t.filters.types}</legend>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((type) => {
              const on = query.types.includes(type);
              return (
                <FlagButton
                  key={type}
                  active={on}
                  onClick={() => patch({ types: on ? query.types.filter((x) => x !== type) : [...query.types, type] })}
                >
                  {t.types[type]}
                </FlagButton>
              );
            })}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t.filters.minBonus}
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={query.minBonus}
            onChange={(e) => patch({ minBonus: e.target.value })}
            className="h-8 w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t.filters.sort}
          <select
            value={query.sort}
            onChange={(e) => patch({ sort: e.target.value as Query["sort"] })}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {(["score", "bonus", "expires"] as const).map((s) => (
              <option key={s} value={s}>
                {t.sorts[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {toggles.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={query[k]} onCheckedChange={(v) => patch({ [k]: v } as Partial<Query>)} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function BankCell({ t, L, o }: { t: BankBonusMessages; L: LFn; o: ScoredOffer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <span className="font-medium text-foreground">{o.bank ?? o.title ?? "—"}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t.hideDetails : t.showDetails}
          title={open ? t.hideDetails : t.showDetails}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
          {o.title && <p className="text-foreground">{o.title}</p>}
          {o.notes && <p className="whitespace-pre-line">{o.notes}</p>}
          <p>
            {t.whyScore}: {o.reasons.map(L).join(" · ")}
          </p>
          {o.detailUrl && (
            <a href={o.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
              {t.readPost} <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StarButton({ o, onFlag }: { o: ScoredOffer; onFlag: FlagFn }) {
  return (
    <button
      type="button"
      aria-pressed={!!o.flags.star}
      onClick={() => onFlag(o.key, "star", o.flags.star ? 0 : 1)}
      className="rounded p-1 hover:bg-muted"
    >
      <Star className={cn("size-4", o.flags.star ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
    </button>
  );
}

/** 폰: 카드 목록. */
function OfferCards({ t, L, offers, onFlag }: { t: BankBonusMessages; L: LFn; offers: ScoredOffer[]; onFlag: FlagFn }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
      {offers.map((o) => (
        <li key={o.key} className={cn("p-3 text-sm", o.flags.hidden && "opacity-50")}>
          <div className="flex items-start justify-between gap-2">
            <BankCell t={t} L={L} o={o} />
            <div className="flex shrink-0 items-center gap-1">
              <span className="font-semibold tabular-nums text-foreground">{bonusLabel(o)}</span>
              <StarButton o={o} onFlag={onFlag} />
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <Field label={t.col.dd} value={ddLine(t, o)} />
            <Field label={t.col.expires} value={o.expiresOn ?? "—"} />
            <Field label={t.col.pull} value={o.pullText} />
            <Field label={t.col.cc} value={o.ccFundingText} />
            <Field label={t.col.source} value={o.sources.join(", ")} />
          </dl>
          <Tags L={L} o={o} className="mt-2" />
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{value ?? "—"}</dd>
    </>
  );
}

/** 태블릿·데스크톱: 표. */
function OfferTable({ t, L, offers, onFlag }: { t: BankBonusMessages; L: LFn; offers: ScoredOffer[]; onFlag: FlagFn }) {
  const c = t.col;
  const cols = [c.bank, c.bonus, c.dd, c.expires, c.pull, c.cc, c.tags, c.source, c.star];
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {cols.map((col) => (
              <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card align-top">
          {offers.map((o) => (
            <tr key={o.key} className={cn(o.flags.hidden && "opacity-50")}>
              <td className="max-w-72 px-3 py-2">
                <BankCell t={t} L={L} o={o} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="font-semibold text-foreground">{bonusLabel(o)}</div>
                <div className="text-muted-foreground" title={o.reasons.map(L).join("\n")}>
                  {t.score} {o.score}
                </div>
              </td>
              <td className="max-w-44 px-3 py-2">{ddLine(t, o)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{o.expiresOn ?? "—"}</td>
              <td className="max-w-32 px-3 py-2">{o.pullText ?? "—"}</td>
              <td className="max-w-40 px-3 py-2">{o.ccFundingText ?? "—"}</td>
              <td className="max-w-40 px-3 py-2">
                <Tags L={L} o={o} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{o.sources.join(", ")}</td>
              <td className="px-3 py-2">
                <StarButton o={o} onFlag={onFlag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentPosts({ t, nowMs }: { t: BankBonusMessages; nowMs: number }) {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/bank-bonus/posts", { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { posts?: PostRow[]; error?: string } | null;
        if (!res.ok || !data?.posts) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setPosts(data.posts);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => ctrl.abort();
  }, []);

  return (
    <section className="mt-12">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{t.posts}</h2>
      <p className="text-xs text-muted-foreground">{t.postsHint}</p>
      {error && (
        <p className="mt-2 text-sm text-destructive">
          {t.loadFailed}: {error}
        </p>
      )}
      {posts && posts.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t.postsEmpty}</p>}
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card text-sm">
        {posts?.map((p) => {
          const at = p.published_at ?? p.first_seen_at;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
              {p.pinned === 1 && (
                <Chip>
                  <Pin className="size-3" aria-hidden />
                  {t.pinned}
                </Chip>
              )}
              {p.detail_url ? (
                <a href={p.detail_url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-foreground underline-offset-2 hover:underline">
                  {p.title}
                </a>
              ) : (
                <span className="min-w-0 text-foreground">{p.title}</span>
              )}
              {p.pinned !== 1 && (
                <span className="text-xs text-muted-foreground">
                  {t.ago(Math.max(0, Math.floor((nowMs - Date.parse(at)) / 60_000)))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
