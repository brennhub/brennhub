import type { Ingredient, QtySelection, Step } from "./types";

/**
 * 레시피 받아쓰기 — 결정론 파서.
 *
 * 순수 모듈이다. window·fetch·React 참조 없음 — API route(Workers)·server
 * component·`npx tsx` 단위 테스트가 모두 같은 코드를 쓴다.
 *
 * **파서는 확정하지 않는다.** 입력 줄은 원문 그대로 남고, 여기서 하는 일은
 * 그 안에서 "수량으로 보이는 구간"을 *제안*하는 것뿐이다. 어디까지가 양인지
 * 정하는 건 사용자다 (types.ts 참조).
 *
 * 이 구조에서 **누락은 공짜다** — 후보가 0개면 원문이 그대로 남고 사용자가
 * 직접 지정하면 된다. 비싼 건 오탐 하나가 자동 선택까지 가서 배율을 바꾸는
 * 순간 원문이 조용히 망가지는 경우뿐이다. 아래 가드는 전부 그것만 겨냥한다.
 */

/* ------------------------------------------------------------------ *
 * 사전
 * ------------------------------------------------------------------ */

/**
 * 단위 사전. 자동 검출에만 쓴다 — 사전에 없으면 후보 0개가 되고,
 * 사용자가 "직접 고르기"로 잡으면 그만이다 (parseManualSpan).
 */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "cc",
  "큰술",
  "작은술",
  "티스푼",
  "스푼",
  "T",
  "t",
  "컵",
  "개",
  "쪽",
  "줌",
  "움큼",
  "꼬집",
  "포기",
  "모",
  "장",
  "알",
  "마리",
  "봉지",
  "봉",
  "캔",
  "대",
  "단",
  "줄",
  "조각",
  "통",
  "덩이",
  "인분",
] as const;

/** 대소문자만 다른 표기도 검출한다. 저장은 원문 그대로 — 정규화하지 않는다. */
const UNIT_CASE_VARIANTS = ["G", "KG", "Kg", "ML", "Ml", "L", "CC", "Cc"];

/**
 * 한글 수사.
 *
 * ⚠️ 한자어 수사(일·이·삼·사·오·육·칠·팔·구·십)와 만·천·백을 **절대 추가하지 말 것.**
 * `삼겹살`이 "삼 겹살"로, `먹을만큼`이 "만 큼"으로 깨진다. 실제 사용자 데이터에
 * 둘 다 있다.
 */
export const KOREAN_NUMERALS: Record<string, number> = {
  반: 0.5,
  한: 1,
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
};

/**
 * 단위 바로 뒤에 이 글자가 오면 후보 취소 — `3개월`의 개, `2단계`의 단.
 * 오탐 제보가 오면 한 줄 추가, 아니면 한 줄 삭제로 끝나는 납작한 배열이다.
 *
 * 넣지 말 것: `2줄기`·`5개입`·`3대접`은 오탐처럼 보여도 숫자를 배로 곱하는 게
 * 실제로 맞다 (4줄기·10개입). 단위 글자만 낯설 뿐이다.
 */
export const UNIT_TAIL_BLOCK = ["월", "계"];

/** 이 어절 자체는 수량이 아니다 — 수사+단위가 우연히 실재 명사인 경우. */
export const NOT_QTY_TOKENS = ["네모", "세모", "열대", "두통", "세대"];

/** 단계 매칭에서만 제외하는 꼬리말. 화면 표시는 언제나 원문 그대로다. */
export const NON_NAME_TOKENS = [
  "약간",
  "조금",
  "적당량",
  "취향껏",
  "넉넉히",
  "정도",
];

/* ------------------------------------------------------------------ *
 * 수량 문법
 * ------------------------------------------------------------------ */

/** 정규식 대안은 항상 긴 것부터 — `kg`이 `g`에, `봉지`가 `봉`에 먹히지 않게. */
function byLengthDesc(a: string, b: string) {
  return b.length - a.length;
}

const UNIT_ALTERNATION = [...UNITS, ...UNIT_CASE_VARIANTS]
  .sort(byLengthDesc)
  .join("|");

const KO_NUM_ALTERNATION = Object.keys(KOREAN_NUMERALS)
  .sort(byLengthDesc)
  .join("|");

/** 범위 구분자 — 물결·하이픈·en dash 계열. `\\-` 이스케이프 필수(빠지면 문자 범위로 해석된다). */
const RANGE_SEP = "[~～\\-–—]";

/** 정수 300 · 소수 0.5 · 분수 1/4. 분수를 먼저 둬야 "1/4"이 "1"로 잘리지 않는다. */
const NUM = String.raw`\d+\s*/\s*\d+|\d+(?:\.\d+)?`;
/** 범위 2~3 · 2-3 */
const RANGE = `(?:${NUM})\\s*${RANGE_SEP}\\s*(?:${NUM})`;
/** 대분수 "1 1/2" — 번역 레시피에서 흔하다. 없으면 "1/2"만 잡혀 값이 틀린다. */
const MIXED = String.raw`\d+\s+\d+\s*/\s*\d+`;
/** 숫자 수량 — 범위 → 대분수 → 단일 순서가 중요하다. */
const DIGIT_QTY = `${RANGE}|${MIXED}|${NUM}`;

const RE_RANGE_ONLY = new RegExp(`^${RANGE}$`);

/**
 * 수량 후보 스캐너. 갈래를 따로 캡처한다 — 숫자와 한글 수사는 가드 규칙이 다르므로
 * 어느 쪽이 맞았는지 알아야 한다.
 *
 * 플래그는 `g`만. `i`는 금지 — `T`(큰술)와 `t`(작은술)는 대소문자가 의미를 가른다.
 */
const RE_CANDIDATE = new RegExp(
  `(?:(${DIGIT_QTY})|(${KO_NUM_ALTERNATION}))\\s*(${UNIT_ALTERNATION})`,
  "g",
);

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const ALNUM = /[A-Za-z0-9]/;
/** 숫자 앞에 붙으면 수량이 아니다. `,`가 빠지면 "1,000ml"이 "000ml"(=0)로 잡힌다. */
const BEFORE_DIGIT_BLOCK = /[A-Za-z0-9.,]/;
const HAS_LETTER = /[A-Za-z가-힣ㄱ-ㆎ]/;

/** 문자열 경계는 언제나 통과. 한글 수사만 앞뒤 한글을 막는다. */
function blockedByWord(ch: string, koreanBranch: boolean): boolean {
  if (!ch) return false;
  if (ALNUM.test(ch)) return true;
  return koreanBranch && HANGUL.test(ch);
}

/** "1/4" → 0.25 · "1 1/2" → 1.5 · "0.5" → 0.5 · "한" → 1. 실패는 null. */
function toNumber(token: string): number | null {
  const t = token.trim();
  if (t in KOREAN_NUMERALS) return KOREAN_NUMERALS[t];

  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "2~3" → { from: 2, to: 3, sep: "~" }. 범위가 아니면 null. */
export function splitRange(
  text: string,
): { from: number; to: number; sep: string } | null {
  const m = text.trim().match(new RegExp(`^(.+?)\\s*(${RANGE_SEP})\\s*(.+)$`));
  if (!m) return null;
  const from = toNumber(m[1]);
  const to = toNumber(m[3]);
  if (from === null || to === null) return null;
  return { from, to, sep: m[2] };
}

/* ------------------------------------------------------------------ *
 * 후보 검출
 * ------------------------------------------------------------------ */

export type QtyCandidate = QtySelection;

/** 수량 토큰 → qty / qtyText 분해. 범위는 양 끝을 보존한다. */
function readQuantity(
  token: string,
): { qty: number | null; qtyText: string | null } | null {
  if (RE_RANGE_ONLY.test(token.trim())) {
    const range = splitRange(token);
    if (!range) return null;
    return { qty: null, qtyText: token.replace(/\s+/g, "") };
  }
  const qty = toNumber(token);
  if (qty === null) return null;
  return { qty, qtyText: null };
}

/**
 * 한 줄 안의 수량 토큰 후보 전부. 겹치는 후보는 나오지 않는다
 * (`matchAll`이 lastIndex를 매치 끝으로 민다).
 *
 * 가드를 lookbehind가 아니라 **매치 후 검증**으로 거는 이유: lookbehind는
 * 실패하면 엔진이 한 칸 전진해 재시도하므로 탈락한 매치 *안쪽*에 가짜 후보를
 * 만든다 ("비타민A1/4컵" → "4컵"). matchAll은 그 경로를 원천 차단한다.
 *
 * 괄호는 따로 다루지 않는다 — 일반 스캔이 `1kg`만 잡으므로 `(1kg)`의
 * 오프셋에서 괄호가 자연히 빠진다.
 */
export function findQtyCandidates(text: string): QtyCandidate[] {
  const out: QtyCandidate[] = [];

  for (const m of text.matchAll(RE_CANDIDATE)) {
    const start = m.index;
    if (start === undefined) continue;
    const end = start + m[0].length;

    const koreanBranch = m[2] !== undefined;
    const before = start > 0 ? text[start - 1] : "";
    const after = end < text.length ? text[end] : "";

    // 선행 — 한글 수사는 앞 글자가 한글이어도 탈락("세척한 대파"의 "한 대").
    // 숫자는 앞이 한글이어도 통과해야 한다("물500ml").
    if (koreanBranch) {
      if (blockedByWord(before, true)) continue;
    } else if (before && BEFORE_DIGIT_BLOCK.test(before)) {
      continue;
    }

    // 후행 — 숫자 갈래는 한글을 허용한다("300g짜리"를 살리려고).
    if (blockedByWord(after, koreanBranch)) continue;
    if (UNIT_TAIL_BLOCK.includes(after)) continue;
    if (NOT_QTY_TOKENS.includes(m[0].replace(/\s+/g, ""))) continue;

    const quantity = readQuantity(m[1] ?? m[2]);
    if (!quantity) continue;

    // unit은 매치된 원문 그대로 담는다 (정규화 X — types.ts QtySelection 참조).
    out.push({ start, end, ...quantity, unit: m[3] });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * 수동 지정
 * ------------------------------------------------------------------ */

/** 선택 구간 양끝에서 떼어낼 글자 — 괄호·공백·구분 기호. */
const SPAN_TRIM = /[\s()[\]{}·,]/;

const RE_MANUAL_SPAN = new RegExp(
  `^(${DIGIT_QTY}|${KO_NUM_ALTERNATION})\\s*([\\s\\S]*)$`,
);

/**
 * 사용자가 직접 고른 구간 → QtySelection. **사전을 보지 않는다** —
 * 앞머리를 수량으로 읽고 나머지 전부를 단위로 삼는다. 그래서 "500 그램"·"2공기"처럼
 * 사전에 없는 단위도, "3"처럼 단위 없는 수량도 잡을 수 있다.
 *
 * 앞머리가 수량이 아니면 null (UI가 확인 버튼을 잠근다).
 */
export function parseManualSpan(
  text: string,
  rawStart: number,
  rawEnd: number,
): QtySelection | null {
  let start = Math.max(0, Math.min(rawStart, text.length));
  let end = Math.max(0, Math.min(rawEnd, text.length));
  if (start >= end) return null;

  while (start < end && SPAN_TRIM.test(text[start])) start += 1;
  while (end > start && SPAN_TRIM.test(text[end - 1])) end -= 1;
  if (start >= end) return null;

  const span = text.slice(start, end);
  const m = span.match(RE_MANUAL_SPAN);
  if (!m) return null;

  const quantity = readQuantity(m[1]);
  if (!quantity) return null;

  // span은 이미 우측 트림돼 있으므로 m[2]에 꼬리 공백이 없다 →
  // `span.endsWith(unit)` 불변식이 그대로 성립한다 (scale.ts가 여기 기댄다).
  return { start, end, ...quantity, unit: m[2] };
}

/* ------------------------------------------------------------------ *
 * 재료 만들기
 * ------------------------------------------------------------------ */

/**
 * 입력 한 줄 → Ingredient.
 *
 * 공백 정규화는 **여기서 딱 한 번** 한다. 오프셋이 이 결과 문자열 기준이므로
 * 이후 어디서도(특히 서버에서) 다시 정규화하면 안 된다.
 *
 * 후보가 정확히 1개면 자동 선택한다. 2개 이상이면 미선택으로 두고 사용자가 고른다.
 */
export function makeIngredient(line: string): Ingredient | null {
  const text = line.trim().replace(/\s+/g, " ");
  if (!text) return null;

  const candidates = findQtyCandidates(text);
  return { text, sel: candidates.length === 1 ? candidates[0] : null };
}

/* ------------------------------------------------------------------ *
 * 타이머 파싱 (단계 텍스트)
 * ------------------------------------------------------------------ */

const TIME_NUM = String.raw`\d+(?:\.\d+)?(?:\s*${RANGE_SEP}\s*\d+(?:\.\d+)?)?`;
/**
 * `10분` · `30초` · `1시간` · `10분 30초` · `1시간 30분` · `5~10분`(앞 값).
 * `(?!의)`는 "3분의 1"을 3분으로 읽는 오탐을 막는다.
 */
const RE_TIMER = new RegExp(
  `(${TIME_NUM})\\s*(시간|분|초)(?!의)` +
    `(?:\\s*(${TIME_NUM})\\s*(분|초)(?!의))?`,
);

const TIME_UNIT_SEC: Record<string, number> = { 시간: 3600, 분: 60, 초: 1 };

/** 범위는 앞 값 채택. */
function leadingValue(token: string): number | null {
  const range = splitRange(token);
  if (range) return range.from;
  return toNumber(token);
}

/** 타이머 상한 24시간 — 오탐이 만든 말도 안 되는 값을 걸러낸다. */
export const MAX_TIMER_SEC = 24 * 3600;

/** 단계 텍스트 → timerSec. 첫 매칭 1개만, 없으면 null. */
export function parseTimerSec(text: string): number | null {
  const m = text.match(RE_TIMER);
  if (!m) return null;

  const head = leadingValue(m[1]);
  if (head === null) return null;
  let seconds = head * TIME_UNIT_SEC[m[2]];

  // "10분 30초" / "1시간 30분" — 뒤 단위가 더 작을 때만 더한다.
  if (m[3] && m[4] && TIME_UNIT_SEC[m[4]] < TIME_UNIT_SEC[m[2]]) {
    const tail = leadingValue(m[3]);
    if (tail !== null) seconds += tail * TIME_UNIT_SEC[m[4]];
  }

  const rounded = Math.round(seconds);
  if (rounded <= 0 || rounded > MAX_TIMER_SEC) return null;
  return rounded;
}

/** 순서 textarea → Step[]. 엔터 = 단계 분리, 빈 줄 무시. */
export function parseSteps(raw: string): Step[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, timerSec: parseTimerSec(text) }));
}

/** Step[] → textarea 원문 (수정 화면 왕복용). */
export function stepsToText(steps: Step[]): string {
  return steps.map((s) => s.text).join("\n");
}

/* ------------------------------------------------------------------ *
 * 단계별 재료 매칭
 * ------------------------------------------------------------------ */

/**
 * 재료 이름으로 볼 어절들 — `text`에서 확정된 수량 구간을 도려낸 나머지.
 *
 * 파서가 추측한 경계가 아니라 **사용자가 확인한 경계**라 구 모델보다 안전하다.
 * 길이 4+ 어절은 길이 3+ 접미사도 후보에 넣는다 — "큐브삼겹살"이 단계의
 * "삼겹살"에 걸리게 하려면 이게 필요하다.
 */
export function ingredientNameTokens(ing: Ingredient): string[] {
  const base = ing.sel
    ? ing.text.slice(0, ing.sel.start) + ing.text.slice(ing.sel.end)
    : ing.text;

  const out: string[] = [];
  for (const word of base.replace(/[()[\]{}]/g, " ").split(/\s+/)) {
    if (!word) continue;
    if (NON_NAME_TOKENS.includes(word)) continue;
    // 글자가 하나도 없는 어절("300", "~", "1/2")은 "300번 저어"에 걸린다.
    if (!HAS_LETTER.test(word)) continue;

    out.push(word);
    for (let i = 1; i <= word.length - 3; i += 1) out.push(word.slice(i));
  }
  return out;
}

/**
 * 재료 이름 어절(또는 그 접미사)이 단계 `text`에 부분 문자열로 포함되면
 * 그 단계의 재료로 본다.
 *
 * 과매칭·누락을 인정한 규칙이다 — 조리 모드 하단 1줄 요약은 보조 정보라
 * 틀려도 치명적이지 않다. 수동 지정은 BACKLOG.
 */
export function stepIngredientIndexes(
  stepText: string,
  ingredients: Ingredient[],
): number[] {
  const hits: number[] = [];
  ingredients.forEach((ing, index) => {
    if (ingredientNameTokens(ing).some((token) => stepText.includes(token))) {
      hits.push(index);
    }
  });
  return hits;
}

/* ------------------------------------------------------------------ *
 * 숫자 표기 (근사 분수는 scale.ts)
 * ------------------------------------------------------------------ */

/** 소수 꼬리 정리 — 300 → "300", 2.5 → "2.5", 0.3333 → "0.33". */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}
