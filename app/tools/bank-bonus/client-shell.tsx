"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { useBankBonusMessages, type BankBonusMessages } from "@/lib/bank-bonus/messages";
import type { OffersResponse } from "@/lib/bank-bonus/offers";
import type { AccountType, EvaluatedOffer, Evidence, FreshnessRow, OfferFlags, OfferTag, PostRow } from "@/lib/bank-bonus/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 한 페이지, 위에서 아래로:
 *   제목 → 신선도 한 줄 → 숫자 3개 → 지금 할 만한 오퍼 Top 5 → 전체 표(폰은 카드) → 최근 7일 새 글.
 * 시각 규칙: 강조색은 파랑 하나(토글 ON·선택 칩·주 버튼). 카드 글자 크기는 lg/sm/xs 세 단계, 간격은 8px 격자.
 * "확인 필요"는 흐리게(경고 아님), 30일 내 마감은 호박색. 상대 시간은 서버가 넘긴 nowMs 기준.
 */

type Props = { freshness: FreshnessRow[] | null; loadError: string | null; nowMs: number };
type FlagName = "star" | "hidden" | "applied";
type FlagFn = (key: string, flag: FlagName, value: 0 | 1) => void;
type M = BankBonusMessages;

const ACCENT_ON = "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500";
const TYPE_OPTIONS: AccountType[] = ["checking", "savings", "business", "unknown"];
const DAY = 86_400_000;

type Query = {
  types: AccountType[];
  minBonus: string;
  sort: "bonus" | "expires";
  doableOnly: boolean;
  caOnly: boolean;
  excludeExisting: boolean;
  excludeHold: boolean;
  excludeBranch: boolean;
  excludeHardPull: boolean;
  includeHidden: boolean;
};
type ToggleKey = "doableOnly" | "caOnly" | "excludeExisting" | "excludeHold" | "excludeBranch" | "excludeHardPull" | "includeHidden";

// 캘리포니아 거주자 가능만·내 거래 은행 제외는 켜진 채 시작한다.
const INITIAL_QUERY: Query = {
  types: ["checking", "savings"],
  minBonus: "300",
  sort: "bonus",
  doableOnly: false,
  caOnly: true,
  excludeExisting: true,
  excludeHold: false,
  excludeBranch: false,
  excludeHardPull: false,
  includeHidden: false,
};

function toSearch(q: Query): string {
  const b = (v: boolean) => (v ? "1" : "0");
  // 서버 기본값에 기대지 않고 전부 명시 — 화면 상태가 곧 요청.
  return new URLSearchParams({
    types: q.types.join(","),
    minBonus: q.minBonus.trim(),
    sort: q.sort,
    doableOnly: b(q.doableOnly),
    caOnly: b(q.caOnly),
    excludeExisting: b(q.excludeExisting),
    excludeHold: b(q.excludeHold),
    excludeBranch: b(q.excludeBranch),
    excludeHardPull: b(q.excludeHardPull),
    includeHidden: b(q.includeHidden),
  }).toString();
}

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; data: OffersResponse };

// ───────────────────────── 값 → 문구 (전부 messages.ts) ─────────────────────────

type Shown = { text: string; muted?: boolean; amber?: boolean };

/** 크게 보이는 금액 — 겹친 오퍼면 기본(직접입금만) 금액. */
function bonusShown(t: M, o: EvaluatedOffer): Shown {
  if (o.bonusBase != null) return { text: t.bonusRange(o.bonusBase, o.bonusBase) };
  if (o.bonusMax == null) return { text: t.unknown, muted: true };
  return { text: o.bonusMin == null ? t.bonusUpTo(o.bonusMax) : t.bonusRange(o.bonusMin, o.bonusMax) };
}

/** 금액 아래 작은 줄 — "저축 포함 시 $900 (예치금 $15,000, 90일)", 없으면 제목 괄호 메모. */
function bonusSubline(t: M, o: EvaluatedOffer): string | null {
  const shown = o.bonusBase ?? o.bonusMax;
  if (o.bonusTotalWithDeposit != null && (shown == null || o.bonusTotalWithDeposit > shown)) {
    return t.withDeposit(o.bonusTotalNote, o.bonusTotalWithDeposit, o.extraHoldAmount ?? o.depositHoldAmount, o.extraHoldDays ?? o.depositHoldDays);
  }
  return o.bonusNote;
}

function deadlineShown(t: M, o: EvaluatedOffer, nowMs: number): Shown {
  if (!o.expiresOn) return { text: t.noDeadline, muted: true };
  const left = (Date.parse(`${o.expiresOn}T23:59:59Z`) - nowMs) / DAY;
  if (left < 0) return { text: t.deadlinePassed(o.expiresOn), muted: true };
  return { text: o.expiresOn, amber: left <= 30 };
}

function requirementShown(t: M, o: EvaluatedOffer): Shown {
  if (o.ddRequired === 0) return { text: t.ddNone };
  if (o.ddRequired === 1) return { text: t.dd(o.ddAmount, o.ddDays) };
  return { text: t.unknown, muted: true };
}

function reapplyShown(t: M, o: EvaluatedOffer): Shown {
  if (o.reapply.state === "value" && o.reapply.months != null) return { text: t.reapply(o.reapply.months) };
  if (o.reapply.state === "not_stated") return { text: t.reapplyNotStated, muted: true };
  return { text: t.unknown, muted: true };
}

function regionShown(t: M, o: EvaluatedOffer): Shown {
  if (o.nationwide === 1) return { text: t.region.nationwide };
  if (o.caEligible === 1) return { text: t.region.ca };
  if (o.caEligible === 0) return { text: t.region.notCa };
  return { text: t.unknown, muted: true };
}

function pullShown(t: M, o: EvaluatedOffer): Shown {
  if (o.hardPull === 0) return { text: t.pull.soft };
  if (o.hardPull === 1) return { text: t.pull.hard };
  return { text: t.unknown, muted: true };
}

function ccShown(t: M, o: EvaluatedOffer): Shown {
  if (o.ccFundingAllowed === 0) return { text: t.cc.no };
  if (o.ccFundingAllowed === 1) return { text: o.ccFundingMax != null ? t.cc.upTo(o.ccFundingMax) : t.cc.yes };
  return { text: t.unknown, muted: true };
}

function tagText(t: M, tag: OfferTag): string {
  return tag.code === "hold" ? t.tags.hold(tag.amount ?? null, tag.days ?? null) : t.tags[tag.code];
}

const TAG_TONE: Record<OfferTag["code"], string> = {
  hold: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  branch: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  hardPull: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  expiring: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  new: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  targeted: "border-border bg-muted text-muted-foreground",
};

function sourceNames(t: M, o: EvaluatedOffer): string {
  return o.sources.map((s) => t.sources[s] ?? s).join(", ");
}

/** "For October, 2026 / last change 10/13/26" · RSS lastBuildDate → 화면 언어로. 못 읽으면 표시 안 함. */
function asOfShown(t: M, raw: string | null): string | null {
  if (!raw) return null;
  const parts: string[] = [];
  const month = raw.match(/For ([A-Z][a-z]+), (20\d\d)/);
  if (month) {
    const idx = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(month[1].toLowerCase());
    if (idx >= 0) parts.push(t.asOfMonth(Number(month[2]), idx + 1));
  }
  const change = raw.match(/last change (\d{1,2}\/\d{1,2}\/\d{2})/);
  if (change) parts.push(t.asOfChange(change[1]));
  if (!parts.length) {
    const d = Date.parse(raw);
    if (Number.isFinite(d)) parts.push(t.asOfFeed(new Date(d).toISOString().slice(0, 10)));
  }
  return parts.length ? parts.join(" · ") : null;
}

// ───────────────────────── 페이지 ─────────────────────────

export function BankBonusClientShell({ freshness, loadError, nowMs }: Props) {
  const tool = useMessages().tools["bank-bonus"];
  const t = useBankBonusMessages();
  const tableRef = useRef<HTMLElement>(null);

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

  // 그 자리에서 바로 반영 → POST → 조용히 다시 불러와 숫자·Top 5 정합.
  const setFlag = useCallback<FlagFn>(async (key, flag, value) => {
    setFlagError(null);
    setState((s) => {
      if (s.kind !== "ok") return s;
      const upd = (o: EvaluatedOffer) => (o.key === key ? { ...o, flags: { ...o.flags, [flag]: value } as OfferFlags } : o);
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

  const showDoable = useCallback(() => {
    patch({ doableOnly: true });
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [patch]);

  const data = state.kind === "ok" ? state.data : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{tool?.name}</h1>
        <p className="mt-2 text-muted-foreground">{tool?.description}</p>
      </header>

      <Freshness t={t} rows={freshness} loadError={loadError} nowMs={nowMs} />

      {state.kind === "error" && (
        <p className="mt-4 text-sm text-destructive">
          {t.loadFailed}: {state.message}
        </p>
      )}
      {flagError && (
        <p className="mt-4 text-sm text-destructive">
          {t.flagFailed}: {flagError}
        </p>
      )}

      <Stats t={t} data={data} onDoable={showDoable} />
      <TopPicks t={t} data={data} nowMs={nowMs} onFlag={setFlag} />

      <section ref={tableRef} className="mt-12 scroll-mt-4">
        <h2 className="text-base font-semibold text-foreground">{t.table}</h2>
        <Filters t={t} query={query} patch={patch} />
        <div className="mt-4">
          {state.kind === "loading" && <p className="text-sm text-muted-foreground">{t.loading}</p>}
          {data && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">{t.count(data.offers.length)}</p>
              {data.offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.empty}</p>
              ) : (
                <>
                  <OfferCards t={t} offers={data.offers} nowMs={nowMs} onFlag={setFlag} />
                  <OfferTable t={t} offers={data.offers} nowMs={nowMs} onFlag={setFlag} />
                </>
              )}
            </>
          )}
        </div>
      </section>

      <RecentPosts t={t} nowMs={nowMs} />
      <p className="mt-12 text-xs text-muted-foreground">{t.adminNote}</p>
    </main>
  );
}

// ───────────────────────── 신선도 · 숫자 ─────────────────────────

function Freshness({ t, rows, loadError, nowMs }: { t: M; rows: FreshnessRow[] | null; loadError: string | null; nowMs: number }) {
  if (loadError) {
    return (
      <p className="mt-4 text-xs text-destructive" title={loadError}>
        {t.loadFailed}
      </p>
    );
  }
  return (
    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {rows?.map((r) => {
        const asOf = asOfShown(t, r.source_as_of);
        const ago = r.last_fetch_at ? t.ago(Math.max(0, Math.floor((nowMs - Date.parse(r.last_fetch_at)) / 60_000))) : t.never;
        return (
          <span key={r.id} className="inline-flex flex-wrap items-center gap-x-1">
            <span>{t.sources[r.key] ?? r.name}</span>
            <span aria-hidden>·</span>
            <span title={r.last_fetch_at ?? undefined}>{!r.enabled ? t.parked : ago}</span>
            {r.enabled && asOf && (
              <>
                <span aria-hidden>·</span>
                <span>{asOf}</span>
              </>
            )}
            {r.enabled && r.stale && <span className="text-amber-700 dark:text-amber-300">· {t.stale}</span>}
            {r.enabled && r.error && (
              <span className="text-destructive" title={r.error}>
                · {t.fetchError}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function Stats({ t, data, onDoable }: { t: M; data: OffersResponse | null; onDoable: () => void }) {
  const tile = "rounded-lg border border-border bg-card p-4 text-left";
  const value = (n: number | undefined) => (
    <span className="mt-2 block text-2xl font-semibold tabular-nums text-foreground">{n == null ? "…" : t.statsUnit(n)}</span>
  );
  return (
    <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
      <button type="button" onClick={onDoable} title={t.statsHint} className={cn(tile, "transition-colors hover:border-blue-500/60 hover:bg-blue-500/5")}>
        <span className="block text-xs text-muted-foreground">{t.stats.doable}</span>
        {value(data?.summary.doable)}
      </button>
      <div className={tile}>
        <span className="block text-xs text-muted-foreground">{t.stats.expiringSoon}</span>
        {value(data?.summary.expiringSoon)}
      </div>
      <div className={tile}>
        <span className="block text-xs text-muted-foreground">{t.stats.newThisWeek}</span>
        {value(data?.summary.newThisWeek)}
      </div>
    </div>
  );
}

// ───────────────────────── 공용 조각 ─────────────────────────

function Value({ v, className }: { v: Shown; className?: string }) {
  return (
    <span className={cn(v.muted ? "text-muted-foreground" : "text-foreground", v.amber && "text-amber-700 dark:text-amber-300", className)}>
      {v.text}
    </span>
  );
}

/** 값 + 작은 "근거" 버튼 — 누르면 근거 문장·출처 종류·링크가 아래에 펼쳐진다. 근거 없으면 버튼 없음. */
function Fact({ t, v, ev, className }: { t: M; v: Shown; ev?: Evidence | null; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)}>
      <span className="inline-flex flex-wrap items-baseline gap-x-2">
        <Value v={v} />
        {ev && (
          <button
            type="button"
            onClick={() => setOpen((x) => !x)}
            aria-expanded={open}
            className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {t.evidence}
          </button>
        )}
      </span>
      {ev && open && (
        <span className="mt-1 block rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          <span className="block text-foreground">“{ev.quote}”</span>
          <span className="mt-1 flex flex-wrap gap-x-2">
            <span>{t.evidenceSources[ev.source]}</span>
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                {t.openSource}
              </a>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", className)}>{children}</span>
  );
}

function Methods({ t, o }: { t: M; o: EvaluatedOffer }) {
  if (!o.applyMethods?.length) return <Value v={{ text: t.unknown, muted: true }} />;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {o.applyMethods.map((m) => (
        <Chip key={m} className="border-border bg-background text-foreground">
          {t.methods[m]}
        </Chip>
      ))}
    </span>
  );
}

function Tags({ t, o, className }: { t: M; o: EvaluatedOffer; className?: string }) {
  if (!o.tags.length && !o.flags.applied) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {o.flags.applied ? <Chip className={ACCENT_ON}>{t.appliedBadge}</Chip> : null}
      {o.tags.map((tag) => (
        <Chip key={tag.code} className={TAG_TONE[tag.code]}>
          {tagText(t, tag)}
        </Chip>
      ))}
    </span>
  );
}

function ActionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border px-3 text-xs transition-colors",
        active ? ACCENT_ON : "border-input bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function FlagButtons({ t, o, onFlag }: { t: M; o: EvaluatedOffer; onFlag: FlagFn }) {
  return (
    <>
      {(["star", "hidden", "applied"] as const).map((f) => (
        <ActionButton key={f} active={!!o.flags[f]} onClick={() => onFlag(o.key, f, o.flags[f] ? 0 : 1)}>
          {t.actions[f]}
        </ActionButton>
      ))}
    </>
  );
}

const linkPrimary =
  "inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600";
const linkSecondary = "inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs text-foreground hover:bg-muted";

// ───────────────────────── Top 5 ─────────────────────────

function TopPicks({ t, data, nowMs, onFlag }: { t: M; data: OffersResponse | null; nowMs: number; onFlag: FlagFn }) {
  return (
    <section className="mt-12">
      <h2 className="text-base font-semibold text-foreground">{t.top}</h2>
      {data && data.top.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t.topEmpty}</p>}
      <ol className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.top.map((o, i) => (
          <li key={o.key} className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
            <span className="text-xs text-muted-foreground">{i + 1}</span>
            <div className="mt-1 flex items-start justify-between gap-4">
              <h3 className="min-w-0 text-lg font-semibold text-foreground">{o.bank ?? o.title}</h3>
              <div className="shrink-0 text-right">
                <Value v={bonusShown(t, o)} className="text-lg font-semibold tabular-nums" />
                {bonusSubline(t, o) && <p className="text-xs text-muted-foreground">{bonusSubline(t, o)}</p>}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm">
              <dt className="text-xs text-muted-foreground">{t.col.expires}</dt>
              <dd><Fact t={t} v={deadlineShown(t, o, nowMs)} ev={o.evidence.expires} /></dd>
              <dt className="text-xs text-muted-foreground">{t.col.methods}</dt>
              <dd><Methods t={t} o={o} /></dd>
              <dt className="text-xs text-muted-foreground">{t.col.requirement}</dt>
              <dd><Fact t={t} v={requirementShown(t, o)} ev={o.evidence.requirement} /></dd>
              <dt className="text-xs text-muted-foreground">{t.col.reapply}</dt>
              <dd><Fact t={t} v={reapplyShown(t, o)} ev={o.reapply.evidence} /></dd>
              <dt className="text-xs text-muted-foreground">{t.col.region}</dt>
              <dd className="flex flex-wrap gap-x-2">
                <Value v={regionShown(t, o)} />
                <span className="text-xs text-muted-foreground">{t.col.pull}</span>
                <Value v={pullShown(t, o)} />
              </dd>
            </dl>
            <Tags t={t} o={o} className="mt-4" />
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {o.detailUrl && (
                <a href={o.detailUrl} target="_blank" rel="noopener noreferrer" className={linkPrimary}>
                  {t.viewPost}
                </a>
              )}
              {o.bankOfferUrl && (
                <a href={o.bankOfferUrl} target="_blank" rel="noopener noreferrer" className={linkSecondary}>
                  {t.bankPage}
                </a>
              )}
              <FlagButtons t={t} o={o} onFlag={onFlag} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ───────────────────────── 필터 ─────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-blue-600 dark:bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600",
        )}
      >
        <span className={cn("block size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </button>
      {label}
    </label>
  );
}

function Filters({ t, query, patch }: { t: M; query: Query; patch: (p: Partial<Query>) => void }) {
  const toggles: [ToggleKey, string][] = [
    ["doableOnly", t.filters.doableOnly],
    ["caOnly", t.filters.caOnly],
    ["excludeExisting", t.filters.excludeExisting],
    ["excludeHold", t.filters.excludeHold],
    ["excludeBranch", t.filters.excludeBranch],
    ["excludeHardPull", t.filters.excludeHardPull],
    ["includeHidden", t.filters.includeHidden],
  ];
  return (
    <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4 rounded-lg border border-border bg-card p-4">
      <fieldset>
        <legend className="mb-2 text-xs text-muted-foreground">{t.filters.types}</legend>
        <div className="flex flex-wrap gap-1">
          {TYPE_OPTIONS.map((type) => {
            const on = query.types.includes(type);
            return (
              <ActionButton
                key={type}
                active={on}
                onClick={() => patch({ types: on ? query.types.filter((x) => x !== type) : [...query.types, type] })}
              >
                {t.types[type]}
              </ActionButton>
            );
          })}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-xs text-muted-foreground">
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
      <label className="flex flex-col gap-2 text-xs text-muted-foreground">
        {t.filters.sort}
        <select
          value={query.sort}
          onChange={(e) => patch({ sort: e.target.value as Query["sort"] })}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="bonus">{t.sorts.bonus}</option>
          <option value="expires">{t.sorts.expires}</option>
        </select>
      </label>
      <div className="flex basis-full flex-wrap gap-x-6 gap-y-2 lg:basis-auto">
        {toggles.map(([k, label]) => (
          <Toggle key={k} checked={query[k]} onChange={(v) => patch({ [k]: v } as Partial<Query>)} label={label} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── 표 · 폰 카드 ─────────────────────────

function StarButton({ t, o, onFlag }: { t: M; o: EvaluatedOffer; onFlag: FlagFn }) {
  return (
    <button
      type="button"
      aria-pressed={!!o.flags.star}
      aria-label={t.actions.star}
      title={t.actions.star}
      onClick={() => onFlag(o.key, "star", o.flags.star ? 0 : 1)}
      className="rounded p-1 hover:bg-muted"
    >
      <Star className={cn("size-4", o.flags.star ? "fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" : "text-muted-foreground")} />
    </button>
  );
}

function ExpandButton({ t, open, onClick }: { t: M; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? t.collapse : t.expand}
      title={open ? t.collapse : t.expand}
      className="rounded p-0.5 text-muted-foreground hover:bg-muted"
    >
      {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
    </button>
  );
}

/** 펼침 — 출처 원문(제목·메모·약관) + 링크 + 숨김/신청 완료. */
function Original({ t, o, onFlag }: { t: M; o: EvaluatedOffer; onFlag: FlagFn }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {o.title && (
        <p>
          <span className="mr-2">{t.originalTitle}</span>
          <span className="text-foreground">{o.title}</span>
        </p>
      )}
      {o.notes && (
        <p className="whitespace-pre-line">
          <span className="mr-2">{t.originalNotes}</span>
          {o.notes}
        </p>
      )}
      {o.churnText && (
        <p>
          <span className="mr-2">{t.originalTerms}</span>
          {o.churnText}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {o.detailUrl && (
          <a href={o.detailUrl} target="_blank" rel="noopener noreferrer" className={linkPrimary}>
            {t.viewPost}
          </a>
        )}
        {o.bankOfferUrl && (
          <a href={o.bankOfferUrl} target="_blank" rel="noopener noreferrer" className={linkSecondary}>
            {t.bankPage}
          </a>
        )}
        <ActionButton active={!!o.flags.hidden} onClick={() => onFlag(o.key, "hidden", o.flags.hidden ? 0 : 1)}>
          {t.actions.hidden}
        </ActionButton>
        <ActionButton active={!!o.flags.applied} onClick={() => onFlag(o.key, "applied", o.flags.applied ? 0 : 1)}>
          {t.actions.applied}
        </ActionButton>
      </div>
    </div>
  );
}

function OfferTable({ t, offers, nowMs, onFlag }: { t: M; offers: EvaluatedOffer[]; nowMs: number; onFlag: FlagFn }) {
  const c = t.col;
  const cols = [c.bank, c.bonus, c.expires, c.methods, c.requirement, c.reapply, c.region, c.pull, c.cc, c.tags, c.source, c.star];
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  return (
    <div className="hidden max-h-[75vh] overflow-auto rounded-lg border border-border md:block">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col} className="sticky top-0 z-10 border-b border-border bg-muted px-2 py-2 font-medium whitespace-nowrap text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {offers.map((o, i) => (
            <Fragment key={o.key}>
              <tr className={cn(i % 2 ? "bg-muted/30" : "bg-card", o.flags.hidden && "opacity-50")}>
                <td className="min-w-40 px-2 py-2">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{o.bank ?? o.title}</span>
                    <ExpandButton t={t} open={open.has(o.key)} onClick={() => toggle(o.key)} />
                  </div>
                  {o.flags.applied ? <Chip className={cn(ACCENT_ON, "mt-1")}>{t.appliedBadge}</Chip> : null}
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <Value v={bonusShown(t, o)} className="tabular-nums" />
                  {bonusSubline(t, o) && <div className="max-w-48 whitespace-normal text-muted-foreground">{bonusSubline(t, o)}</div>}
                </td>
                <td className="min-w-28 px-2 py-2"><Fact t={t} v={deadlineShown(t, o, nowMs)} ev={o.evidence.expires} /></td>
                <td className="px-2 py-2"><Methods t={t} o={o} /></td>
                <td className="min-w-36 max-w-64 px-2 py-2"><Fact t={t} v={requirementShown(t, o)} ev={o.evidence.requirement} /></td>
                <td className="min-w-28 max-w-64 px-2 py-2"><Fact t={t} v={reapplyShown(t, o)} ev={o.reapply.evidence} /></td>
                <td className="px-2 py-2 whitespace-nowrap"><Value v={regionShown(t, o)} /></td>
                <td className="px-2 py-2"><Value v={pullShown(t, o)} /></td>
                <td className="px-2 py-2"><Value v={ccShown(t, o)} /></td>
                <td className="min-w-28 px-2 py-2">
                  <span className="flex flex-wrap gap-1">
                    {o.tags.map((tag) => (
                      <Chip key={tag.code} className={TAG_TONE[tag.code]}>
                        {tagText(t, tag)}
                      </Chip>
                    ))}
                  </span>
                </td>
                <td className="px-2 py-2 text-muted-foreground">{sourceNames(t, o)}</td>
                <td className="px-2 py-2"><StarButton t={t} o={o} onFlag={onFlag} /></td>
              </tr>
              {open.has(o.key) && (
                <tr className={i % 2 ? "bg-muted/30" : "bg-card"}>
                  <td colSpan={cols.length} className="px-2 pb-4">
                    <Original t={t} o={o} onFlag={onFlag} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 폰: 카드 목록 — 표와 같은 항목, 같은 순서. */
function OfferCards({ t, offers, nowMs, onFlag }: { t: M; offers: EvaluatedOffer[]; nowMs: number; onFlag: FlagFn }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = (o: EvaluatedOffer): [string, React.ReactNode][] => [
    [t.col.expires, <Fact key="e" t={t} v={deadlineShown(t, o, nowMs)} ev={o.evidence.expires} />],
    [t.col.methods, <Methods key="m" t={t} o={o} />],
    [t.col.requirement, <Fact key="r" t={t} v={requirementShown(t, o)} ev={o.evidence.requirement} />],
    [t.col.reapply, <Fact key="a" t={t} v={reapplyShown(t, o)} ev={o.reapply.evidence} />],
    [t.col.region, <Value key="g" v={regionShown(t, o)} />],
    [t.col.pull, <Value key="p" v={pullShown(t, o)} />],
    [t.col.cc, <Value key="c" v={ccShown(t, o)} />],
    [t.col.source, <span key="s" className="text-muted-foreground">{sourceNames(t, o)}</span>],
  ];
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
      {offers.map((o) => (
        <li key={o.key} className={cn("p-4 text-sm", o.flags.hidden && "opacity-50")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <span className="font-semibold text-foreground">{o.bank ?? o.title}</span>
              <ExpandButton t={t} open={open === o.key} onClick={() => setOpen(open === o.key ? null : o.key)} />
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <div className="text-right">
                <Value v={bonusShown(t, o)} className="tabular-nums" />
                {bonusSubline(t, o) && <div className="max-w-40 text-xs text-muted-foreground">{bonusSubline(t, o)}</div>}
              </div>
              <StarButton t={t} o={o} onFlag={onFlag} />
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            {rows(o).map(([label, v]) => (
              <Fragment key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </Fragment>
            ))}
          </dl>
          <Tags t={t} o={o} className="mt-2" />
          {open === o.key && (
            <div className="mt-2">
              <Original t={t} o={o} onFlag={onFlag} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── 최근 7일 새 글 ─────────────────────────

function RecentPosts({ t, nowMs }: { t: M; nowMs: number }) {
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
      <h2 className="text-base font-semibold text-foreground">{t.posts}</h2>
      {error && (
        <p className="mt-2 text-sm text-destructive" title={error}>
          {t.loadFailed}
        </p>
      )}
      {posts && posts.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t.postsEmpty}</p>}
      {posts && posts.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card text-sm">
          {posts.map((p) => {
            const at = p.published_at ?? p.first_seen_at;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
                {p.pinned === 1 && <Chip className="border-border bg-muted text-muted-foreground">{t.pinned}</Chip>}
                {p.detail_url ? (
                  <a href={p.detail_url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-foreground underline-offset-2 hover:underline">
                    {p.title}
                  </a>
                ) : (
                  <span className="min-w-0 text-foreground">{p.title}</span>
                )}
                {p.pinned !== 1 && (
                  <span className="text-xs text-muted-foreground">{t.postAgo(Math.max(0, Math.floor((nowMs - Date.parse(at)) / 60_000)))}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
