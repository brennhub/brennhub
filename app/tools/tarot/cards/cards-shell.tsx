"use client";

import Link from "next/link";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { TAROT_CARDS } from "@/lib/tarot/cards";
import { toRoman } from "@/lib/tarot/glyphs";
import type { OrientationEntry, TarotCard as TarotCardData } from "@/lib/tarot/types";
import { TarotCard } from "../components/tarot-card";

/**
 * 카드 사전 열람 — 22장 전체의 정/역 essence·키워드(도메인 태그)·gloss·Waite 원문 공개.
 * "우리는 지어내지 않는다"의 실체이자 투명성 증명 + SEO 자산.
 * 크롬(제목·라벨)은 ko/en, 본문(essence·키워드·gloss)은 ko 전용 합의 —
 * en locale에서 카드 이름만 영문 데이터를 쓴다.
 */

function OrientationBlock({ label, entry }: { label: string; entry: OrientationEntry }) {
  const tt = useMessages().tarot;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium">{label}</h4>
      <p className="mt-2 text-sm leading-relaxed break-keep">{entry.essence.ko}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {entry.keywords.map((k) => (
          <li key={k.word.ko}>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium">
                {k.word.ko}
              </span>
              {k.domains.map((d) => (
                <span
                  key={d}
                  className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-foreground/15"
                >
                  {tt[`domain_${d}` as keyof typeof tt] as string}
                </span>
              ))}
            </span>
            <p className="mt-1 pl-1 text-xs leading-relaxed text-muted-foreground break-keep">
              {k.gloss.ko}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground italic">{entry.waite}</p>
    </div>
  );
}

function CardEntry({ card }: { card: TarotCardData }) {
  const tt = useMessages().tarot;
  const { locale } = useLocale();
  return (
    <section id={card.slug} className="rounded-lg bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-start gap-4">
        <TarotCard face="front" card={card} size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="font-serif text-sm text-muted-foreground">{toRoman(card.id)}</p>
          <h3 className="mt-1 text-lg font-semibold break-keep">
            {locale === "en" ? card.name.en : card.name.ko}
          </h3>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {locale === "en" ? card.name.ko : card.name.en}
          </p>
          <dl className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            {card.meta.element && (
              <div className="flex gap-2">
                <dt className="shrink-0">{tt.dictMetaElement}</dt>
                <dd>{card.meta.element.ko}</dd>
              </div>
            )}
            {card.meta.astrology && (
              <div className="flex gap-2">
                <dt className="shrink-0">{tt.dictMetaAstrology}</dt>
                <dd>{card.meta.astrology.ko}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="shrink-0">{tt.dictMetaSymbols}</dt>
              <dd className="break-keep">{card.meta.symbols.map((s) => s.ko).join(" · ")}</dd>
            </div>
          </dl>
        </div>
      </div>

      <OrientationBlock label={tt.orientationUpright} entry={card.upright} />
      <div className="mt-4 border-t border-foreground/10" />
      <OrientationBlock label={tt.orientationReversed} entry={card.reversed} />
    </section>
  );
}

export function CardsDictionaryShell() {
  const tt = useMessages().tarot;
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tt.dictTitle}</h1>
        <p className="mt-3 text-muted-foreground break-keep">{tt.dictIntro}</p>
        <Link
          href="/tools/tarot"
          className="mt-4 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← {tt.dictBack}
        </Link>
      </header>

      <div className="mt-10 flex flex-col gap-6">
        {TAROT_CARDS.map((card) => (
          <CardEntry key={card.slug} card={card} />
        ))}
      </div>

      <p className="mt-8 text-center">
        <Link
          href="/tools/tarot"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← {tt.dictBack}
        </Link>
      </p>
    </main>
  );
}
