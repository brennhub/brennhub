import type { Ingredient, Step } from "./types";

/**
 * 레시피 받아쓰기 — 결정론 파서 (기획서 §4).
 *
 * 순수 모듈이다. window·fetch·React 참조 없음 — API route(Workers)·server
 * component·`npx tsx` 단위 테스트가 모두 같은 코드를 쓴다.
 *
 * 설계 원칙 (BRENNHUB.md §3 "확정 못 하는 건 확정 안 한다"):
 * 확정 못 하는 값은 지어내지 않는다. `raw` 저장은 실패가 아니라 정상 경로다.
 * "약간"·"한 움큼"을 그램으로 추정하는 순간 이 도구는 거짓말을 시작한다.
 */

/* ------------------------------------------------------------------ *
 * §4-1  재료 라인
 * ------------------------------------------------------------------ */

/**
 * 단위 사전 (기획서 §4-1.3 초기 목록 그대로).
 * 확장은 BACKLOG — 사전에 없으면 `raw`로 정직하게 남는다.
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

/**
 * 대소문자 무시로 받아줄 미터법 라틴 단위 → 정규형.
 * `T`(큰술)/`t`(작은술)는 대소문자가 의미를 가르므로 **제외**한다.
 */
const CASE_INSENSITIVE_UNITS: Record<string, string> = {
  G: "g",
  KG: "kg",
  Kg: "kg",
  ML: "ml",
  Ml: "ml",
  L: "l",
  CC: "cc",
  Cc: "cc",
};

/** 한글 수사 (기획서 §4-1.2). */
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

/** 정규식 대안은 항상 긴 것부터 — `kg`이 `g`에, `봉지`가 `봉`에 먹히지 않게. */
function byLengthDesc(a: string, b: string) {
  return b.length - a.length;
}

const UNIT_ALTERNATION = [
  ...UNITS,
  ...Object.keys(CASE_INSENSITIVE_UNITS),
].sort(byLengthDesc).join("|");

const KO_NUM_ALTERNATION = Object.keys(KOREAN_NUMERALS)
  .sort(byLengthDesc)
  .join("|");

/** 범위 구분자 — 물결·하이픈·en dash 계열. */
const RANGE_SEP = "[~～\\-–—]";

/** 정수 300 · 소수 0.5 · 분수 1/4. 분수를 먼저 둬야 "1/4"이 "1"로 잘리지 않는다. */
const NUM = String.raw`\d+\s*/\s*\d+|\d+(?:\.\d+)?`;
/** 범위 2~3 · 2-3 */
const RANGE = `(?:${NUM})\\s*${RANGE_SEP}\\s*(?:${NUM})`;
/** 숫자 수량 = 범위 우선 */
const DIGIT_QTY = `${RANGE}|${NUM}`;
/** 전체 수량 = 숫자 + 한글 수사 */
const ANY_QTY = `${DIGIT_QTY}|${KO_NUM_ALTERNATION}`;

/** A1 — 띄어쓰기 형태: `이름 + 수량 + 단위` ("돼지고기 목살 300 g", "대파 한 줌") */
const RE_NAME_QTY_UNIT = new RegExp(
  `^(.+?)\\s+(${ANY_QTY})\\s*(${UNIT_ALTERNATION})$`,
);
/** A2 — 붙여쓰기 형태: `이름수량단위` ("물500ml"). 숫자 수량만 허용. */
const RE_NAME_QTY_UNIT_JOINED = new RegExp(
  `^(.+?)(${DIGIT_QTY})\\s*(${UNIT_ALTERNATION})$`,
);
/** B — 단위 없이 숫자만: `이름 + 수량` ("계란 3") */
const RE_NAME_QTY = new RegExp(`^(.+?)\\s+(${DIGIT_QTY})$`);
/**
 * C1 — 사전에 없는 단위: `이름 + 수량 + 미지의단위` ("물 500 그램", "고기 한 근").
 * 양 표현 **전체**를 raw로 떼어낸다. 단순 마지막-공백 분리로 처리하면
 * `name="물 500"`이 되어 이름에 수량이 눌어붙고, 그 이름이 §4-4 단계 매칭에서
 * "500번 젓는다" 같은 문장에 걸린다.
 */
const RE_NAME_TRAILING_AMOUNT = new RegExp(
  `^(.+?)\\s+((?:${ANY_QTY})\\s*\\S*)$`,
);

const RE_RANGE_ONLY = new RegExp(`^${RANGE}$`);
const RE_TRAILING_ALNUM = /[A-Za-z0-9.]$/;

function normalizeUnit(raw: string): string {
  return CASE_INSENSITIVE_UNITS[raw] ?? raw;
}

/** "1/4" → 0.25 · "0.5" → 0.5 · "300" → 300 · "한" → 1. 실패는 null. */
function toNumber(token: string): number | null {
  const t = token.trim();
  if (t in KOREAN_NUMERALS) return KOREAN_NUMERALS[t];

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

function emptyIngredient(name: string): Ingredient {
  return { name, qty: null, qtyText: null, unit: null, raw: null };
}

function buildQuantified(
  name: string,
  qtyToken: string,
  unit: string | null,
): Ingredient | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  // 범위는 양 끝을 보존한다 — 평균으로 뭉개면 "2~3개"가 "2.5개"가 된다.
  if (RE_RANGE_ONLY.test(qtyToken.trim())) {
    const range = splitRange(qtyToken);
    if (!range) return null;
    return {
      name: trimmedName,
      qty: null,
      qtyText: qtyToken.replace(/\s+/g, ""),
      unit,
      raw: null,
    };
  }

  const qty = toNumber(qtyToken);
  if (qty === null) return null;
  return { name: trimmedName, qty, qtyText: null, unit, raw: null };
}

/**
 * 재료 한 줄 → Ingredient (기획서 §4-1).
 *
 * 매칭 순서:
 *   A1 `이름 수량 단위`  → 정량
 *   A2 `이름수량단위`     → 정량 (붙여쓰기. 숫자 수량만 — "오메가3" 오탐 차단)
 *   B  `이름 수량`        → 단위 없는 정량 ("계란 3")
 *   C  마지막 공백 분리   → `이름 / raw` (감각량)
 *   C' 공백 없음          → 전체를 이름으로
 */
export function parseIngredientLine(line: string): Ingredient | null {
  const text = line.trim().replace(/\s+/g, " ");
  if (!text) return null;

  const spaced = text.match(RE_NAME_QTY_UNIT);
  if (spaced) {
    const built = buildQuantified(spaced[1], spaced[2], normalizeUnit(spaced[3]));
    if (built) return built;
  }

  const joined = text.match(RE_NAME_QTY_UNIT_JOINED);
  // 이름이 영숫자로 끝나면 붙여쓰기 해석을 포기한다 — "비타민B12"의 "12",
  // "300g"의 "00"을 수량으로 오해하는 경로가 정확히 여기다.
  if (joined && !RE_TRAILING_ALNUM.test(joined[1])) {
    const built = buildQuantified(joined[1], joined[2], normalizeUnit(joined[3]));
    if (built) return built;
  }

  // §4-1.4 "단위 매칭 실패 + 숫자 없음"의 대우 — 숫자가 있으면 수량으로 남긴다.
  // 한글 수사는 여기서 제외한다("김치 반"의 "반"은 이름 조각일 수 있으므로 raw로).
  const noUnit = text.match(RE_NAME_QTY);
  if (noUnit) {
    const built = buildQuantified(noUnit[1], noUnit[2], null);
    if (built) return built;
  }

  // 사전에 없는 단위 — 양 표현 전체를 raw로. 이름에 숫자가 눌어붙지 않게.
  const trailing = text.match(RE_NAME_TRAILING_AMOUNT);
  if (trailing) {
    return {
      name: trailing[1],
      qty: null,
      qtyText: null,
      unit: null,
      raw: trailing[2],
    };
  }

  const lastSpace = text.lastIndexOf(" ");
  if (lastSpace > 0) {
    return {
      name: text.slice(0, lastSpace),
      qty: null,
      qtyText: null,
      unit: null,
      raw: text.slice(lastSpace + 1),
    };
  }

  return emptyIngredient(text);
}

/** 입력 화면 라이브 힌트용 분류 (기획서 §2-1). */
export type IngredientKind = "quantified" | "sensory" | "name-only";

export function ingredientKind(ing: Ingredient): IngredientKind {
  if (ing.qty !== null || ing.qtyText !== null) return "quantified";
  if (ing.raw !== null) return "sensory";
  return "name-only";
}

/* ------------------------------------------------------------------ *
 * §4-3  타이머 파싱 (단계 텍스트)
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

/** 범위는 앞 값 채택 (기획서 §4-3). */
function leadingValue(token: string): number | null {
  const range = splitRange(token);
  if (range) return range.from;
  return toNumber(token);
}

/** 타이머 상한 24시간 — 오탐이 만든 말도 안 되는 값을 걸러낸다. */
export const MAX_TIMER_SEC = 24 * 3600;

/** 단계 텍스트 → timerSec. 첫 매칭 1개만, 없으면 null (기획서 §4-3). */
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
 * §4-4  단계별 재료 매칭
 * ------------------------------------------------------------------ */

/**
 * 재료 `name` 전체 또는 name의 마지막 공백 토큰이 단계 `text`에 부분 문자열로
 * 포함되면 그 단계의 재료로 본다 (기획서 §4-4).
 *
 * 과매칭·누락을 인정한 규칙이다 — 조리 모드 하단 1줄 요약은 보조 정보라
 * 틀려도 치명적이지 않다. 수동 지정은 BACKLOG.
 */
export function stepIngredientIndexes(
  stepText: string,
  ingredients: Ingredient[],
): number[] {
  const haystack = stepText;
  const hits: number[] = [];

  ingredients.forEach((ing, index) => {
    const name = ing.name.trim();
    if (!name) return;
    if (haystack.includes(name)) {
      hits.push(index);
      return;
    }
    const lastToken = name.slice(name.lastIndexOf(" ") + 1);
    if (lastToken && lastToken !== name && haystack.includes(lastToken)) {
      hits.push(index);
    }
  });

  return hits;
}

/* ------------------------------------------------------------------ *
 * 숫자 표기 (§4-2 근사 분수는 scale.ts)
 * ------------------------------------------------------------------ */

/** 소수 꼬리 정리 — 300 → "300", 2.5 → "2.5", 0.3333 → "0.33". */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}
