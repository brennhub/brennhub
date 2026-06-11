"use client";

import { useEffect, useReducer, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { TAROT_CARDS } from "@/lib/tarot/cards";
import { initialRitualState, ritualReducer, type Stage } from "@/lib/tarot/ritual-state";
import { TarotCard } from "./components/tarot-card";
import { GroundingStage } from "./components/stages/grounding-stage";
import { QuestionStage } from "./components/stages/question-stage";

/**
 * 의식 플로우 오케스트레이터 — 단일 페이지 상태머신 (라우트 이동 없음).
 * 전환 가드·비가역 불변식은 lib/tarot/ritual-state.ts 리듀서가 단일 권위.
 * S8 리딩은 Task 3 — 현재 result는 임시 결과 화면.
 * ?debug=1: 22장 앞면 그리드 (entry 한정, 편집장 dev 검수용).
 */

/** "처음부터 다시" — 모달 없는 인라인 2탭 확인 (3초 후 자동 복귀). */
function RestartLink({ onReset }: { onReset: () => void }) {
  const tt = useMessages().tarot;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onReset() : setArmed(true))}
      className="mx-auto mt-12 block text-xs text-muted-foreground underline-offset-2 hover:underline"
    >
      {armed ? tt.restartConfirm : tt.restart}
    </button>
  );
}

const RESTARTABLE: readonly Stage[] = ["shuffle", "cut", "deal", "choice", "open"];

export function TarotClientShell() {
  const t = useMessages();
  const tt = t.tarot;
  const [state, dispatch] = useReducer(ritualReducer, initialRitualState);

  // useSearchParams 대신 location 직접 읽기 — Suspense 경계 불필요 (tag-it 선례)
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  if (state.stage === "entry") {
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
            onClick={() => dispatch({ type: "START" })}
            className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground sm:w-auto"
          >
            {tt.startButton}
          </button>
          <div className="flex w-full flex-col items-center gap-1 sm:w-auto">
            <button
              type="button"
              disabled
              className="w-full rounded-lg px-6 py-3 font-medium text-muted-foreground ring-1 ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {tt.dictionaryLink}
            </button>
            <p className="text-xs text-muted-foreground">{tt.comingSoon}</p>
          </div>
        </div>

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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-8 pb-16">
      {state.stage === "grounding" && (
        <GroundingStage onDone={() => dispatch({ type: "GROUNDING_DONE" })} />
      )}

      {state.stage === "question" && (
        <QuestionStage
          question={state.question}
          domain={state.domain}
          onQuestionChange={(value) => dispatch({ type: "SET_QUESTION", value })}
          onDomainSelect={(value) => dispatch({ type: "SET_DOMAIN", value })}
          onSubmit={() => dispatch({ type: "QUESTION_SUBMIT" })}
        />
      )}

      {/* S3~S7 + 임시 결과: 다음 커밋들에서 단계별 구현 */}
      {(state.stage === "shuffle" ||
        state.stage === "cut" ||
        state.stage === "deal" ||
        state.stage === "choice" ||
        state.stage === "open" ||
        state.stage === "result") && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground">{tt.comingSoon}</p>
        </div>
      )}

      {RESTARTABLE.includes(state.stage) && (
        <RestartLink onReset={() => dispatch({ type: "RESET" })} />
      )}
    </main>
  );
}
