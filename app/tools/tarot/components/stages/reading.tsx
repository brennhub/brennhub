"use client";

import { useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { toRoman } from "@/lib/tarot/glyphs";
import type { Domain, OrientationEntry, TarotCard as TarotCardData } from "@/lib/tarot/types";

/**
 * S8 리딩 — 질문이 리딩의 제목(대가의 회수). 카드별: essence(항상) →
 * 매칭 키워드 강조 + gloss(도메인 뱃지와 동일 강조색 = "이 해석이 어느 사전
 * 의미에서 왔는지"의 시각 증명) → 비매칭은 접힘(숨기지 않되 강조만) →
 * 매칭 0개면 mute 정직 문구 → Waite 원문 토글.
 * 본문(essence·gloss)은 ko 전용 합의 — 카드 이름만 locale을 따른다.
 * 같은 리딩 재뽑기 없음 — '새 리딩'은 S0부터.
 */
export type DrawnCard = { card: TarotCardData; orientation: "upright" | "reversed" };

type ReadingProps = {
  question: string;
  domain: Domain;
  cards: readonly DrawnCard[];
  onNewReading: () => void;
};

function CardSection({
  drawn,
  position,
  domain,
  domainLabel,
}: {
  drawn: DrawnCard;
  position: string;
  domain: Domain;
  domainLabel: string;
}) {
  const tt = useMessages().tarot;
  const { locale } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [showWaite, setShowWaite] = useState(false);

  const { card, orientation } = drawn;
  const entry: OrientationEntry = card[orientation];
  const reversed = orientation === "reversed";
  const matched = entry.keywords.filter((k) => k.domains.includes(domain));
  const unmatched = entry.keywords.filter((k) => !k.domains.includes(domain));

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className="text-xs tracking-wide text-muted-foreground">{position}</span>
        <span className="w-8 font-serif text-sm">{toRoman(card.id)}</span>
        <span className="flex-1 font-medium break-keep">
          {locale === "en" ? card.name.en : card.name.ko}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs ring-1",
            reversed ? "bg-foreground/10 ring-foreground/40" : "ring-foreground/20",
          )}
        >
          {reversed ? tt.orientationReversed : tt.orientationUpright}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed break-keep">{entry.essence.ko}</p>

      {matched.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {matched.map((k) => (
            <li key={k.word.ko}>
              <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {k.word.ko}
              </span>
              <p className="mt-1.5 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed text-muted-foreground break-keep">
                {k.gloss.ko}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground break-keep">
          {tt.readingMute.replace("{domain}", domainLabel)}
        </p>
      )}

      {unmatched.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {showAll ? tt.readingAllKeywordsHide : tt.readingAllKeywords}
          </button>
          {showAll && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unmatched.map((k) => (
                <span
                  key={k.word.ko}
                  className="rounded-full px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/15"
                >
                  {k.word.ko}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-foreground/10 pt-3">
        <button
          type="button"
          aria-expanded={showWaite}
          onClick={() => setShowWaite((v) => !v)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showWaite ? tt.readingWaiteHide : tt.readingWaite}
        </button>
        {showWaite && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed italic">{entry.waite}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              — The Pictorial Key to the Tarot (1910)
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function Reading({ question, domain, cards, onNewReading }: ReadingProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];
  const domainLabel = tt[`domain_${domain}` as keyof typeof tt] as string;

  return (
    <div className="flex flex-1 animate-in flex-col gap-8 pt-4 fade-in duration-700">
      <header className="text-center">
        <p className="text-lg font-medium break-keep">“{question}”</p>
        <span className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          {domainLabel}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {cards.map((drawn, i) => (
          <CardSection
            key={drawn.card.slug}
            drawn={drawn}
            position={positions[i]}
            domain={domain}
            domainLabel={domainLabel}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onNewReading}
        className="mx-auto rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground"
      >
        {tt.newReading}
      </button>
    </div>
  );
}
