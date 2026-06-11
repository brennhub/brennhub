"use client";

import { useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { TAROT_CARDS } from "@/lib/tarot/cards";
import { TarotCard } from "./components/tarot-card";

/**
 * S0 입구 — Task 1 골격. [리딩 시작]은 Task 2(의식 플로우 상태머신),
 * [카드 사전 열람]은 Task 3(/tools/tarot/cards)에서 활성화.
 * ?debug=1: 22장 앞면 그리드 — 편집장 dev 검수 + 양 테마 시각 검증용
 * (tag-it 0.8.9 쿼리 게이트 선례). S5~S7 구현 시 제거 가능.
 */
export function TarotClientShell() {
  const t = useMessages();
  const tt = t.tarot;

  // useSearchParams 대신 location 직접 읽기 — Suspense 경계 불필요 (tag-it 선례)
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {tt.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{tt.intro}</p>
      </header>

      {/* 3장 스프레드 예고 — 장식 */}
      <div aria-hidden="true" className="my-12 flex items-center justify-center">
        <TarotCard face="back" size="md" className="-rotate-6 translate-x-3" />
        <TarotCard face="back" size="md" className="z-10 -translate-y-2" />
        <TarotCard face="back" size="md" className="rotate-6 -translate-x-3" />
      </div>

      <p className="mx-auto w-fit rounded-full bg-card px-4 py-2 text-center text-sm ring-1 ring-foreground/10">
        {tt.trustLine}
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {tt.startButton}
        </button>
        <button
          type="button"
          disabled
          className="w-full rounded-lg px-6 py-3 font-medium text-muted-foreground ring-1 ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {tt.dictionaryLink}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {tt.comingSoon}
      </p>

      {debug && (
        <section className="mt-16">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            deck preview (debug)
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {TAROT_CARDS.map((card) => (
              <TarotCard key={card.slug} face="front" card={card} size="sm" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
