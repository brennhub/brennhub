/**
 * 의식 플로우 상태머신 — 단일 페이지 단계 전환 (S0~S7 + 임시 결과).
 * 비가역 불변식의 단일 권위: seal 확정(S4) 이후 이전 단계로 가는 액션은
 * 이 리듀서가 전부 거부한다. UI에서 가드를 중복해도 최종 방어선은 여기.
 *
 * 리듀서는 순수 — 모든 난수(셔플 결과·봉인)는 핸들러에서 계산해 payload로
 * 전달한다 (React StrictMode 이중 호출 안전).
 */

import type { Domain } from "./types";

export type Stage =
  | "entry" // S0
  | "grounding" // S1
  | "question" // S2
  | "shuffle" // S3
  | "cut" // S4
  | "deal" // S5
  | "choice" // S6
  | "open" // S7
  | "result"; // 임시 결과 — Task 3에서 S8 리딩으로 교체

export type Seal = {
  /** 확정 순서 22장. index 0 = top. S5 스프레드는 이 순서를 좌→우로 그대로 펼친다 (추가 난수 없음). */
  deck: readonly number[];
  /** 카드별 숨은 방향 비트(deck과 정렬, 0=정방향 놓임/1=역방향 놓임). 2층 메커니즘 ①층 — 컷에서 고정. */
  bits: readonly (0 | 1)[];
  nonce: string;
  /** SHA-256(buildSealPayload(...)) hex 64자. */
  hash: string;
};

export type RitualState = {
  stage: Stage;
  question: string;
  domain: Domain | null;
  /** 현재 덱 순열. S2 제출 시 identity로 초기화, S3에서 셔플 패스마다 교체. */
  deck: readonly number[];
  shuffleCount: number;
  piles: readonly [readonly number[], readonly number[], readonly number[]] | null;
  /** 재결합 순서로 탭한 더미 index (0..2). */
  picked: readonly number[];
  /** != null === 비가역 진입점. */
  seal: Seal | null;
  /** S5에서 탭한 덱 위치(0~21), 탭 순서대로 — [0]=과거, [1]=현재, [2]=미래. Task 3 검증 표시에도 사용. */
  pickedIndices: readonly number[];
  /** S6 선택 = 세 장 전체 방향의 단일 소스 (2026-06-11 단층 정정). 해시 불포함 — 투명한 선택이라 증명 불필요. */
  userChoice: "upright" | "reversed" | null;
  flippedCount: 0 | 1 | 2 | 3;
};

export type RitualAction =
  | { type: "START" }
  | { type: "GROUNDING_DONE" }
  | { type: "SET_QUESTION"; value: string }
  | { type: "SET_DOMAIN"; value: Domain }
  | { type: "QUESTION_SUBMIT" }
  | { type: "BACK_TO_QUESTION" }
  | { type: "SHUFFLE_APPLY"; deck: number[] }
  | { type: "SHUFFLE_DONE" }
  | { type: "CUT_SPLIT"; first: number; second: number }
  | { type: "CUT_RESET_SPLIT" }
  | { type: "CUT_PICK_PILE"; pile: number }
  | { type: "CUT_FINALIZE"; seal: Seal }
  | { type: "CUT_CONTINUE" }
  | { type: "DEAL_PICK"; index: number }
  | { type: "DEAL_DONE" }
  | { type: "CHOICE_CONFIRM"; choice: "upright" | "reversed" }
  | { type: "FLIP_NEXT" }
  | { type: "OPEN_DONE" }
  | { type: "RESET" };

export const DECK_SIZE = 22;

export const initialRitualState: RitualState = {
  stage: "entry",
  question: "",
  domain: null,
  deck: [],
  shuffleCount: 0,
  piles: null,
  picked: [],
  seal: null,
  pickedIndices: [],
  userChoice: null,
  flippedCount: 0,
};

const identityDeck = () => Array.from({ length: DECK_SIZE }, (_, i) => i);

export function ritualReducer(state: RitualState, action: RitualAction): RitualState {
  switch (action.type) {
    case "START":
      return state.stage === "entry" ? { ...state, stage: "grounding" } : state;

    case "GROUNDING_DONE":
      return state.stage === "grounding" ? { ...state, stage: "question" } : state;

    case "SET_QUESTION":
      return state.stage === "question" ? { ...state, question: action.value } : state;

    case "SET_DOMAIN":
      return state.stage === "question" ? { ...state, domain: action.value } : state;

    case "QUESTION_SUBMIT":
      return state.stage === "question" && state.question.trim() !== "" && state.domain !== null
        ? { ...state, stage: "shuffle", deck: identityDeck(), shuffleCount: 0 }
        : state;

    // 질문 수정은 컷 시작 전(셔플 단계)까지만 — 이후엔 처음부터(RESET).
    case "BACK_TO_QUESTION":
      return state.stage === "shuffle" && state.seal === null
        ? { ...state, stage: "question", deck: [], shuffleCount: 0 }
        : state;

    case "SHUFFLE_APPLY":
      return state.stage === "shuffle"
        ? { ...state, deck: action.deck, shuffleCount: state.shuffleCount + 1 }
        : state;

    case "SHUFFLE_DONE":
      return state.stage === "shuffle" && state.shuffleCount >= 3
        ? { ...state, stage: "cut", piles: null, picked: [] }
        : state;

    case "CUT_SPLIT": {
      if (state.stage !== "cut" || state.piles !== null) return state;
      const { first, second } = action;
      if (!(first >= 1 && first < second && second <= DECK_SIZE - 1)) return state;
      return {
        ...state,
        piles: [
          state.deck.slice(0, first),
          state.deck.slice(first, second),
          state.deck.slice(second),
        ],
        picked: [],
      };
    }

    case "CUT_RESET_SPLIT":
      return state.stage === "cut" && state.piles !== null && state.picked.length === 0
        ? { ...state, piles: null }
        : state;

    case "CUT_PICK_PILE": {
      if (state.stage !== "cut" || state.piles === null || state.seal !== null) return state;
      if (action.pile < 0 || action.pile > 2 || state.picked.includes(action.pile)) return state;
      if (state.picked.length >= 3) return state;
      return { ...state, picked: [...state.picked, action.pile] };
    }

    // ── 비가역 진입점. 이 아래의 액션들만 seal 확정 후 유효하다. ──
    case "CUT_FINALIZE":
      return state.stage === "cut" && state.picked.length === 3 && state.seal === null
        ? { ...state, seal: action.seal, deck: action.seal.deck }
        : state;

    case "CUT_CONTINUE":
      return state.stage === "cut" && state.seal !== null ? { ...state, stage: "deal" } : state;

    // 탭 = 확정 (취소 없음). 동일 위치 재탭·범위 밖 index는 무시.
    case "DEAL_PICK":
      return state.stage === "deal" &&
        state.pickedIndices.length < 3 &&
        Number.isInteger(action.index) &&
        action.index >= 0 &&
        action.index < DECK_SIZE &&
        !state.pickedIndices.includes(action.index)
        ? { ...state, pickedIndices: [...state.pickedIndices, action.index] }
        : state;

    case "DEAL_DONE":
      return state.stage === "deal" && state.pickedIndices.length === 3
        ? { ...state, stage: "choice" }
        : state;

    case "CHOICE_CONFIRM":
      return state.stage === "choice" && state.userChoice === null
        ? { ...state, userChoice: action.choice, stage: "open" }
        : state;

    case "FLIP_NEXT":
      return state.stage === "open" && state.flippedCount < 3
        ? { ...state, flippedCount: (state.flippedCount + 1) as 1 | 2 | 3 }
        : state;

    case "OPEN_DONE":
      return state.stage === "open" && state.flippedCount === 3
        ? { ...state, stage: "result" }
        : state;

    // 전체 초기화 — 질문·도메인 포함. "같은 질문 두 번 묻지 않기" 전통 정합:
    // 질문을 보존하면 같은 질문 재뽑기를 유도하게 되므로 의도적으로 비운다.
    case "RESET":
      return initialRitualState;

    default:
      return state;
  }
}
