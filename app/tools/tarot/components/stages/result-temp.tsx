"use client";

import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { toRoman } from "@/lib/tarot/glyphs";
import type { Domain, TarotCard as TarotCardData } from "@/lib/tarot/types";

/**
 * 임시 결과 화면 — Task 3에서 S8 리딩(essence·키워드 강조·gloss·mute·원전·검증)으로 교체.
 * 지금은 뽑힌 카드 + 최종 방향 + 봉인 해시만 나열해 플로우 round-trip을 증명한다.
 */
type ResultTempProps = {
  question: string;
  domain: Domain | null;
  cards: readonly { card: TarotCardData; orientation: "upright" | "reversed" }[];
  sealHash: string;
  onNewReading: () => void;
};

export function ResultTemp({ question, domain, cards, sealHash, onNewReading }: ResultTempProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];

  return (
    <div className="flex flex-1 animate-in flex-col justify-center gap-8 fade-in duration-700">
      <div className="text-center">
        <p className="text-lg font-medium break-keep">“{question}”</p>
        {domain && (
          <span className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-xs ring-1 ring-foreground/15">
            {tt[`domain_${domain}` as keyof typeof tt] as string}
          </span>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground">{tt.resultTempTitle}</h2>
        <ul className="mt-3 divide-y divide-foreground/10 rounded-lg bg-card ring-1 ring-foreground/10">
          {cards.map(({ card, orientation }, i) => (
            <li key={card.slug} className="flex items-center gap-3 px-4 py-3">
              <span className="w-10 text-xs text-muted-foreground">{positions[i]}</span>
              <span className="w-8 font-serif text-sm">{toRoman(card.id)}</span>
              <span className="flex-1 font-medium">{card.name.ko}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs ring-1",
                  orientation === "reversed"
                    ? "bg-foreground/10 ring-foreground/40"
                    : "ring-foreground/20",
                )}
              >
                {orientation === "reversed" ? tt.orientationReversed : tt.orientationUpright}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center">
        <span className="mr-2 text-[10px] tracking-wide text-muted-foreground uppercase">
          {tt.sealLabel}
        </span>
        <span className="font-mono text-[10px] break-all text-muted-foreground">{sealHash}</span>
      </p>

      <p className="text-center text-xs text-muted-foreground">{tt.resultTempNote}</p>

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
