"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { TAROT_CARDS } from "@/lib/tarot/cards";
import {
  buildSealPayload,
  createRitualRng,
  drawOrientationBits,
  finalOrientation,
  randomNonceHex,
  recombine,
  sha256Hex,
  shufflePass,
  type RitualRng,
} from "@/lib/tarot/ritual";
import { initialRitualState, ritualReducer, type Stage } from "@/lib/tarot/ritual-state";
import { TarotCard } from "./components/tarot-card";
import { ChoiceStage } from "./components/stages/choice-stage";
import { CutStage } from "./components/stages/cut-stage";
import { DealStage } from "./components/stages/deal-stage";
import { GroundingStage } from "./components/stages/grounding-stage";
import { OpenStage } from "./components/stages/open-stage";
import { QuestionStage } from "./components/stages/question-stage";
import { ResultTemp } from "./components/stages/result-temp";
import { ShuffleStage } from "./components/stages/shuffle-stage";

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

  // 의식 1회분 RNG — S2 제출 시 생성, 셔플 드래그·컷 탭의 엔트로피를 누적.
  // 내부 가변이지만 신원은 의식 내내 고정 (state로 두어 렌더 접근 안전).
  const [rng, setRng] = useState<RitualRng | null>(null);
  // sha256 비동기 확정 중 재진입 방지 — 리듀서 가드와 이중 방어
  const finalizingRef = useRef(false);

  // useSearchParams 대신 location 직접 읽기 — Suspense 경계 불필요 (tag-it 선례)
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  const handleQuestionSubmit = () => {
    setRng(createRitualRng());
    dispatch({ type: "QUESTION_SUBMIT" });
  };

  const handleReset = () => {
    finalizingRef.current = false;
    setRng(null);
    dispatch({ type: "RESET" });
  };

  // 뽑힌 3장 + 최종 방향 = 숨은 비트(S4) XOR 전역 선택(S6) — 2층 메커니즘.
  // TAROT_CARDS는 id 순 정렬이 생성기 assert로 보장됨 — index 접근 안전.
  const seal = state.seal;
  const choice = state.userChoice;
  const drawn =
    seal && choice
      ? seal.deck.slice(0, 3).map((id, k) => ({
          card: TAROT_CARDS[id],
          orientation: finalOrientation(seal.bits[k], choice),
        }))
      : [];

  /** 3번째 더미 탭 = 비가역 확정: 순열·방향 비트·nonce 고정 + 봉인 해시 계산. */
  const handlePickPile = async (pile: number) => {
    if (state.stage !== "cut" || state.piles === null || state.seal !== null || !rng) return;
    if (state.picked.includes(pile) || state.picked.length >= 3) return;
    const nextPicked = [...state.picked, pile];
    dispatch({ type: "CUT_PICK_PILE", pile });
    if (nextPicked.length === 3 && !finalizingRef.current) {
      finalizingRef.current = true;
      const deck = recombine(state.piles, nextPicked);
      const bits = drawOrientationBits(rng);
      const nonce = randomNonceHex(16);
      const hash = await sha256Hex(buildSealPayload(deck, bits, nonce));
      dispatch({ type: "CUT_FINALIZE", seal: { deck, bits, nonce, hash } });
    }
  };

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
          onSubmit={handleQuestionSubmit}
        />
      )}

      {state.stage === "shuffle" && rng && (
        <ShuffleStage
          rng={rng}
          shuffleCount={state.shuffleCount}
          onGesture={() => dispatch({ type: "SHUFFLE_APPLY", deck: shufflePass(state.deck, rng) })}
          onDone={() => dispatch({ type: "SHUFFLE_DONE" })}
          onEditQuestion={() => dispatch({ type: "BACK_TO_QUESTION" })}
        />
      )}

      {state.stage === "cut" && rng && (
        <CutStage
          piles={state.piles}
          picked={state.picked}
          seal={state.seal}
          rng={rng}
          onSplit={(first, second) => dispatch({ type: "CUT_SPLIT", first, second })}
          onResetSplit={() => dispatch({ type: "CUT_RESET_SPLIT" })}
          onPickPile={handlePickPile}
          onContinue={() => dispatch({ type: "CUT_CONTINUE" })}
        />
      )}

      {state.stage === "deal" && (
        <DealStage
          dealtCount={state.dealtCount}
          onDeal={() => dispatch({ type: "DEAL_TAP" })}
          onDone={() => dispatch({ type: "DEAL_DONE" })}
        />
      )}

      {state.stage === "choice" && (
        <ChoiceStage onConfirm={(choice) => dispatch({ type: "CHOICE_CONFIRM", choice })} />
      )}

      {state.stage === "open" && (
        <OpenStage
          cards={drawn}
          flippedCount={state.flippedCount}
          onFlip={() => dispatch({ type: "FLIP_NEXT" })}
          onAllOpen={() => dispatch({ type: "OPEN_DONE" })}
        />
      )}

      {state.stage === "result" && state.seal && (
        <ResultTemp
          question={state.question}
          domain={state.domain}
          cards={drawn}
          sealHash={state.seal.hash}
          onNewReading={handleReset}
        />
      )}

      {RESTARTABLE.includes(state.stage) && <RestartLink onReset={handleReset} />}
    </main>
  );
}
