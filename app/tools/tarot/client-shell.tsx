"use client";

import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { getAmbientController } from "@/lib/tarot/ambient";
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
import {
  loadLastReading,
  READING_SCHEMA_VERSION,
  saveLastReading,
  type SavedReading,
} from "@/lib/tarot/reading-storage";
import { TarotCard } from "./components/tarot-card";
import { ChoiceStage } from "./components/stages/choice-stage";
import { CutStage } from "./components/stages/cut-stage";
import { DealStage } from "./components/stages/deal-stage";
import { GroundingStage } from "./components/stages/grounding-stage";
import { OpenStage } from "./components/stages/open-stage";
import { QuestionStage } from "./components/stages/question-stage";
import { Reading } from "./components/stages/reading";
import { ShuffleStage } from "./components/stages/shuffle-stage";

/**
 * 의식 플로우 오케스트레이터 — 단일 페이지 상태머신 (라우트 이동 없음).
 * 전환 가드·비가역 불변식은 lib/tarot/ritual-state.ts 리듀서가 단일 권위.
 * result(S8) 진입 시 마지막 리딩 1건을 localStorage에 저장 — S0 '지난 리딩 보기'로 복원.
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

/** 의식 화면 구석 음소거 토글 — maze play-controls 스타일 (Volume2/VolumeX). */
function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const tt = useMessages().tarot;
  const label = muted ? tt.soundUnmute : tt.soundMute;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={muted}
      title={label}
      className="absolute top-5 right-5 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}

export function TarotClientShell() {
  const t = useMessages();
  const tt = t.tarot;
  const [state, dispatch] = useReducer(ritualReducer, initialRitualState);

  // 의식 1회분 RNG — S2 제출 시 생성, 셔플 드래그·컷 탭의 엔트로피를 누적.
  // 내부 가변이지만 신원은 의식 내내 고정 (state로 두어 렌더 접근 안전).
  const [rng, setRng] = useState<RitualRng | null>(null);
  // sha256 비동기 확정 중 재진입 방지 — 리듀서 가드와 이중 방어
  const finalizingRef = useRef(false);

  // 마지막 리딩 — hydrate 후 로드 (PATTERNS.md localStorage 패턴), '지난 리딩 보기' 진입점.
  const [savedReading, setSavedReading] = useState<SavedReading | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);
  useEffect(() => {
    setSavedReading(loadLastReading());
  }, []);

  const handleQuestionSubmit = () => {
    setRng(createRitualRng());
    dispatch({ type: "QUESTION_SUBMIT" });
  };

  const handleReset = () => {
    getAmbientController().stop(); // 의식 중단/새 리딩 — BGM 페이드아웃
    finalizingRef.current = false;
    setRng(null);
    setViewingSaved(false);
    dispatch({ type: "RESET" });
  };

  // 음소거 미러 — hydrate 후 localStorage 반영 (render에서 컨트롤러 호출 금지)
  const [soundMuted, setSoundMuted] = useState(false);
  useEffect(() => {
    setSoundMuted(getAmbientController().isMuted());
  }, []);
  const handleToggleMute = () => {
    const next = !soundMuted;
    getAmbientController().setMuted(next);
    setSoundMuted(next);
  };

  // 뽑힌 3장 — 카드 = 봉인 덱에서 탭한 위치(S5), hidden = 컷에서 고정된 숨은 방향(①층),
  // orientation = 숨은 비트 × 선택(②층). 3장 각자 다른 결과 가능(혼재가 정상).
  // TAROT_CARDS는 id 순 정렬이 생성기 assert로 보장됨 — index 접근 안전.
  const seal = state.seal;
  const choice = state.userChoice;
  const drawn =
    seal && choice && state.pickedIndices.length === 3
      ? state.pickedIndices.map((deckPos) => {
          const bit = seal.bits[deckPos];
          return {
            card: TAROT_CARDS[seal.deck[deckPos]],
            hidden: (bit === 1 ? "reversed" : "upright") as "upright" | "reversed",
            orientation: finalOrientation(bit, choice),
            marked: seal.deck[deckPos] === state.markedCardId,
          };
        })
      : [];

  // result 진입 시 마지막 리딩 저장 — 동일 데이터 덮어쓰기라 StrictMode 이중 실행 무해.
  const stage = state.stage;
  const domain = state.domain;
  useEffect(() => {
    if (stage !== "result" || !seal || !choice || !domain) return;
    const reading: SavedReading = {
      schemaVersion: READING_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      question: state.question,
      domain,
      cardIds: state.pickedIndices.map((p) => seal.deck[p]),
      choice,
      order: seal.deck,
      bits: seal.bits,
      nonce: seal.nonce,
      hash: seal.hash,
      pickedIndices: state.pickedIndices,
      markedCardId: state.markedCardId,
    };
    saveLastReading(reading);
    setSavedReading(reading);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seal·pickedIndices는 result 진입 시점에 불변 확정
  }, [stage, seal, choice, domain]);

  // BGM은 S8(리딩)에서도 계속 — S8 침묵 설계는 실청취 판정으로 폐기(2026-06-12).
  // 정지 시점은 둘: handleReset(새 리딩/처음부터) · 아래 unmount cleanup(페이지 이탈).
  useEffect(() => () => getAmbientController().stop(), []);

  /** 3번째 더미 탭 = 비가역 확정: 순열·nonce 고정 + 봉인 해시 계산. */
  const handlePickPile = async (pile: number) => {
    if (state.stage !== "cut" || state.piles === null || state.seal !== null || !rng) return;
    if (state.picked.includes(pile) || state.picked.length >= 3) return;
    const nextPicked = [...state.picked, pile];
    dispatch({ type: "CUT_PICK_PILE", pile });
    if (nextPicked.length === 3 && !finalizingRef.current) {
      finalizingRef.current = true;
      const deck = recombine(state.piles, nextPicked);
      const bits = drawOrientationBits(rng); // 카드별 숨은 방향 고정(2층 ①)
      const nonce = randomNonceHex(16);
      const hash = await sha256Hex(buildSealPayload(deck, bits, nonce));
      dispatch({ type: "CUT_FINALIZE", seal: { deck, bits, nonce, hash } });
    }
  };

  // '지난 리딩 보기' — 의식 스테이지 밖의 읽기 전용 뷰 (S8 컴포넌트 재사용, 검증 토글 포함)
  if (state.stage === "entry" && viewingSaved && savedReading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-8 pb-16">
        <Reading
          question={savedReading.question}
          domain={savedReading.domain}
          cards={savedReading.pickedIndices.map((deckPos) => {
            const bit = savedReading.bits[deckPos];
            return {
              card: TAROT_CARDS[savedReading.order[deckPos]],
              hidden: (bit === 1 ? "reversed" : "upright") as "upright" | "reversed",
              orientation: finalOrientation(bit, savedReading.choice),
              marked: savedReading.order[deckPos] === savedReading.markedCardId,
            };
          })}
          order={savedReading.order}
          bits={savedReading.bits}
          nonce={savedReading.nonce}
          hash={savedReading.hash}
          pickedIndices={savedReading.pickedIndices}
          choice={savedReading.choice}
          markedCardId={savedReading.markedCardId}
          onNewReading={handleReset}
        />
      </main>
    );
  }

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
            onClick={() => {
              // 그라운딩 진입과 동시에 BGM 로딩+페이드인 시작 — 호흡 단계가 mp3 디코드 버퍼.
              // [리딩 시작]이 user gesture라 autoplay 정책 충족(iOS resume).
              getAmbientController().start();
              dispatch({ type: "START" });
            }}
            className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground sm:w-auto"
          >
            {tt.startButton}
          </button>
          <Link
            href="/tools/tarot/cards"
            className="w-full rounded-lg px-6 py-3 text-center font-medium ring-1 ring-foreground/15 sm:w-auto"
          >
            {tt.dictionaryLink}
          </Link>
        </div>

        {savedReading && (
          <button
            type="button"
            onClick={() => setViewingSaved(true)}
            className="mx-auto mt-8 block text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            {tt.entryLastReading}
          </button>
        )}
      </main>
    );
  }

  return (
    // 가로 넘침 차단(셔플 궤도)은 셔플 무대 요소로 한정 이동 — main에 두면 max-w-md와 합쳐져
    // 그라운딩 full-bleed 패널(w-screen)이 데스크톱(>448px)에서 컬럼 폭으로 잘렸다(Task 14).
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-8 pb-16">
      {/* 음소거 토글 — 그라운딩부터 음악 재생되므로 의식 전 단계 노출.
          '지난 리딩 보기'는 entry 분기 별도 main — BGM 세션 없음·토글 비노출. */}
      <SoundToggle muted={soundMuted} onToggle={handleToggleMute} />

      {state.stage === "grounding" && (
        // BGM은 [리딩 시작]에서 이미 시작 — "준비됐어요"는 질문 전환만(마음 정리됐으면 진행).
        <GroundingStage onReady={() => dispatch({ type: "GROUNDING_DONE" })} />
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
          markedCardId={state.markedCardId}
          onGesture={() => dispatch({ type: "SHUFFLE_APPLY", deck: shufflePass(state.deck, rng) })}
          onMark={(cardId) => dispatch({ type: "MARK_CARD", cardId })}
          onDone={() => dispatch({ type: "SHUFFLE_DONE" })}
          onEditQuestion={() => dispatch({ type: "BACK_TO_QUESTION" })}
        />
      )}

      {state.stage === "cut" && (
        <CutStage
          piles={state.piles}
          picked={state.picked}
          seal={state.seal}
          onSplit={(first, second) => dispatch({ type: "CUT_SPLIT", first, second })}
          onResetSplit={() => dispatch({ type: "CUT_RESET_SPLIT" })}
          onPickPile={handlePickPile}
          onContinue={() => dispatch({ type: "CUT_CONTINUE" })}
        />
      )}

      {state.stage === "deal" && (
        <DealStage
          pickedIndices={state.pickedIndices}
          markedIndex={
            state.markedCardId !== null && seal ? seal.deck.indexOf(state.markedCardId) : -1
          }
          onPick={(index) => dispatch({ type: "DEAL_PICK", index })}
          onDone={() => dispatch({ type: "DEAL_DONE" })}
        />
      )}

      {state.stage === "choice" && (
        <ChoiceStage onConfirm={(choice) => dispatch({ type: "CHOICE_CONFIRM", choice })} />
      )}

      {state.stage === "open" && state.userChoice && (
        <OpenStage
          cards={drawn}
          choice={state.userChoice}
          flippedCount={state.flippedCount}
          onFlip={() => dispatch({ type: "FLIP_NEXT" })}
          onAllOpen={() => dispatch({ type: "OPEN_DONE" })}
        />
      )}

      {state.stage === "result" && state.seal && state.domain && state.userChoice && (
        <Reading
          question={state.question}
          domain={state.domain}
          cards={drawn}
          order={state.seal.deck}
          bits={state.seal.bits}
          nonce={state.seal.nonce}
          hash={state.seal.hash}
          pickedIndices={state.pickedIndices}
          choice={state.userChoice}
          markedCardId={state.markedCardId}
          onNewReading={handleReset}
        />
      )}

      {RESTARTABLE.includes(state.stage) && <RestartLink onReset={handleReset} />}
    </main>
  );
}
