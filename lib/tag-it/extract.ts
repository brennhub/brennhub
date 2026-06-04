/**
 * 키워드 추출 엔진 (기획서 §3 / C). 전부 사전 + 통계 — 환각 0, 동일 입력=동일 결과.
 *
 * 1차: 토큰화 → (강도 3+) 명사어간 복원·조사 제거 → 1글자/맨숫자 제거
 * 형태 노이즈(문서 종류 무관): 기호·비문자(항상) / 숫자+영문 단편 / 숫자+세는단위 — 강도별 게이트
 * 2차: 불용어(항상) + 명사 확률 모델 + 점수화(빈도 + 위치 가산점 − 약어 감점)
 *
 * 명사 확률 모델(Phase 3, §nounProbability): 용언 어미를 "제거/보존" 이분법으로 떨구지 않고
 * NNG 사전(보호 신호) + 어미·신호1 가중 차감으로 0~100 확률을 매겨 강도별 임계로 채택.
 * 가중치는 weights.ts(코드 수정 없이 조정). 사전 미로딩 시 50% 경로 fallback(안 깨짐).
 *
 * 노이즈 규칙은 전부 "토큰 형태" 기준 — 코드/산문 구분 없이 동일하게 처리.
 * 활성 필터는 필터 강도(1~5)가 결정 (PROFILES). 강도 = 확률 채택 임계.
 */

import { EN_STOPWORDS } from "./stopwords.en";
import {
  KO_FUNCTIONAL_STEMS,
  KO_INFL_ENDINGS,
  KO_JOSA,
  KO_NOUN_VERB_SUFFIXES,
  KO_NUMERIC_COUNTERS,
  KO_STOPWORDS,
  KO_VERBAL_MARKERS,
} from "./stopwords.ko";
import { getNounDict } from "./noun-dict";
import {
  DICT_MAX_DECR,
  DICT_START,
  ENDING_WEIGHTS,
  FUNCTIONAL_STEM_WEIGHT,
  NONDICT_MAX_DECR,
  NONDICT_START,
  SIGNAL1_WEIGHT,
  THRESHOLD,
} from "./weights";
import {
  hasHangul,
  hasLatin,
  normalizeKey,
  splitTokens,
  stripJosa,
} from "./tokenize";
import type {
  Candidate,
  ExtractOptions,
  ExtractedText,
  FilterStrength,
} from "./types";

const BARE_NUMBER = /^\d+$/;
const HAS_DIGIT = /[0-9]/;
/** 글자(어느 문자체계든)·숫자 외 문자 포함 여부 — 화살표·연산기호 등 노이즈 검출. */
const NON_WORD = /[^\p{L}\p{N}]/u;
/** 숫자로 시작해 한글로 끝나는 토큰 (숫자+세는단위 검사용). */
const NUMERIC_HANGUL = /^\d+([가-힣]+)$/;
/** 신호3 — 1음절 한글 + 조사 패턴 (것은/것을/등이…). 1음절이 의존명사면 제거. */
const MONO_PLUS_JOSA = /^[가-힣](을|를|은|는|이|가|의|에|도|로|만)$/;

/** 제목·도입부로 간주해 가산점을 줄 본문 앞부분 길이 */
const TITLE_REGION_CHARS = 120;
/** 제목 영역 등장 토큰 가산점 */
const TITLE_BONUS = 2;

/**
 * 정렬 점수("양" 문제, RULES.md §13). score = (a·freq + b·min(len,CAP) + 제목) × prob/100.
 * 정렬·노출만 — 후보 삭제 0(1회 명사 안 죽고 후순위로). ⚠️ 길이는 반드시 CAP — raw면 base64
 * 쓰레기(길이 100+)가 점수 독식. CAP으로 침몰. 튜닝은 여기 숫자만.
 */
const SORT_FREQ_WEIGHT = 1;
const SORT_LEN_WEIGHT = 2;
const SORT_LEN_CAP = 6;

/** 글자수(코드포인트 기준) — 길이항용. */
function charLen(s: string): number {
  return [...s].length;
}

/**
 * 필터 강도(1~5) → 활성 필터 프로파일. 기호·비문자 제거와 불용어 제거는 전 강도 항상.
 *   1 관대  : 기호만
 *   2       : + 숫자영문단편
 *   3 균형  : + 조사·활용형·숫자카운터 (기존 "명사 위주 ON" 수준)
 *   4       : (3과 동일 — 약어 감점은 0.8.4에서 폐지)
 *   5 엄격  : + URL·1음절 의존명사 제거
 * 영문은 기본 포함(길이 기준 제거·감점 없음) — RULES.md §11. 일반 영단어 노이즈는 사용자가 거름.
 * 빈도 컷(minFreq)은 강도와 분리 — 사용자 옵션만 (§#3). 강도는 빈도 컷 안 함.
 */
type FilterProfile = {
  removeJosa: boolean;
  removeVerbForms: boolean;
  removeLatinDigitFrag: boolean;
  removeNumericCounter: boolean;
  /** URL/웹 토큰 제거 (강도 5) */
  dropUrl: boolean;
  /** 신호3 — 1음절 의존명사+조사 제거 (강도 5) */
  signal3Mono: boolean;
};

const PROFILES: Record<FilterStrength, FilterProfile> = {
  1: {
    removeJosa: false,
    removeVerbForms: false,
    removeLatinDigitFrag: false,
    removeNumericCounter: false,
    dropUrl: false,
    signal3Mono: false,
  },
  2: {
    removeJosa: false,
    removeVerbForms: false,
    removeLatinDigitFrag: true,
    removeNumericCounter: false,
    dropUrl: false,
    signal3Mono: false,
  },
  3: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropUrl: false,
    signal3Mono: false,
  },
  4: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropUrl: false,
    signal3Mono: false,
  },
  5: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropUrl: true,
    signal3Mono: true,
  },
};

/** 조사 길이 내림차순 — 세는단위 뒤 조사 제거용(가드 없음: 카운터 판정 전용). */
const JOSA_DESC = [...KO_JOSA].sort((a, b) => b.length - a.length);

/**
 * 단독 조사 토큰 제외용 Set. 구두점·띄어쓰기(금액(으로)/방식·으로/회사 에서)로 조사가 독립
 * 토큰화되면 후보가 되는데, 순수 조사는 키워드가 아니므로 떨군다. (stripJosa로 어간을 떼는 것과
 * 별개 — 떼어낸 조사는 어디에도 배출되지 않는다. 이건 "처음부터 조사만인 토큰" 제거.)
 * 정상명사 영향 0: 2글자+ 조사 중 사전 등재분(에서/까지/조차 등 7개)도 키워드 가치 없는 오염.
 */
const JOSA_SET: ReadonlySet<string> = new Set(KO_JOSA);

/** 신호1 — 활용 어미 길이 내림차순 (longest-match). */
const INFL_DESC = [...KO_INFL_ENDINGS].sort((a, b) => b.length - a.length);

/** URL 통째 제거 (강도5). 토큰화 전에 빼야 https/youtube 등 파편이 안 생긴다. */
const URL_RE = /https?:\/\/\S+/g;

/**
 * 신호1 — 빈출 명사 보존 빈도 가드. 어간이 용언이어도 이 빈도 이상이면 명사로 보존
 * (보고(報告)/참고처럼 어간이 용언과 겹치는 빈출 명사 살리기, §B).
 */
const SIGNAL1_FREQ_GUARD = 5;

/** 어간이 문서에서 용언 활용(하다/되다/었다…)과 함께 나타나면 true → 용언 어간. */
function isVerbDeriving(stem: string, docTokens: Set<string>): boolean {
  if (stem.length < 1) return false;
  return KO_VERBAL_MARKERS.some((e) => docTokens.has(stem + e));
}

/**
 * 신호1 — 토큰이 '용언 활용형'이면 그 어간을 반환, 아니면 null. 검증 어미만 떼어
 * 어간을 얻고, 그 어간이 문서에서 용언 활용과 공유될 때만. (임의 절단 금지 — KO_INFL_ENDINGS만)
 */
function inflectedStem(text: string, docTokens: Set<string>): string | null {
  for (const e of INFL_DESC) {
    if (text.length > e.length && text.endsWith(e)) {
      const stem = text.slice(0, -e.length);
      if (isVerbDeriving(stem, docTokens)) return stem;
    }
  }
  return null;
}

function isStopword(token: string, norm: string): boolean {
  return EN_STOPWORDS.has(norm) || KO_STOPWORDS.has(token);
}

/** 어미 가중치 길이 내림차순 — longest-match 1개만 적용(합산 아님). */
const ENDING_DESC = [...ENDING_WEIGHTS].sort(
  (a, b) => b.pattern.length - a.pattern.length,
);

/**
 * 토큰 말미에 걸리는 어미(longest-match 1개)와 그 가중치. 없으면 null. 읽기 전용.
 * `>=` — 토큰이 어미와 **정확히 같아도** 매칭(됩니다/봤다 단독 종결형). 0.8.0의 `>`는
 * 정확길이 토큰이 약한 1글자 패턴으로 새던 버그 → 사전 floor(85)가 명사를 보호하므로 안전.
 *
 * 채택 로직(endingDecrement)과 디버그 덤프가 같은 ENDING_DESC longest-match를 쓰도록
 * single-source로 노출 — 덤프의 "걸린어미"가 실제 엔진 판정과 어긋나지 않게 한다.
 */
export function matchedEnding(
  token: string,
): { pattern: string; weight: number } | null {
  for (const { pattern, weight } of ENDING_DESC) {
    if (token.length >= pattern.length && token.endsWith(pattern)) {
      return { pattern, weight };
    }
  }
  return null;
}

/** 토큰 말미 어미의 가중치(차감량). longest-match 1개. 없으면 0. */
function endingDecrement(token: string): number {
  return matchedEnding(token)?.weight ?? 0;
}

/**
 * 명사 확률 0~100 (Phase 3). "세상은 흑백이 아니다" — 제거/보존 이분법 대신 확률로 노출.
 *   사전 O(NNG): DICT_START(100) − min(decr, DICT_MAX_DECR) → 하한 DICT_FLOOR(85). 추락 봉쇄.
 *   사전 X      : NONDICT_START(50) − min(decr, NONDICT_MAX_DECR) → 하한 0.
 *   decr = 어미(longest-match) + 신호1(용언 패러다임). 신호1은 기능어간이면 빈도 무관,
 *          아니면 빈출 명사 보존 가드(freq>=SIGNAL1_FREQ_GUARD) 아래에서만(§B).
 *   denominal(명사+하다 복원)은 이미 명사 어간 → 차감 면제.
 *   사전 미로딩(fallback) 시 inDict=false 경로 = Phase 2 동작과 동일(안 깨짐).
 */
function nounProbability(
  token: string,
  freq: number,
  denominal: boolean,
  docTokens: Set<string>,
): number {
  const dict = getNounDict();
  const inDict = dict !== null && dict.has(token);

  let decr = 0;
  if (!denominal) {
    decr = endingDecrement(token);
    const stem = inflectedStem(token, docTokens);
    if (stem !== null) {
      if (KO_FUNCTIONAL_STEMS.has(stem)) decr += FUNCTIONAL_STEM_WEIGHT;
      else if (freq < SIGNAL1_FREQ_GUARD) decr += SIGNAL1_WEIGHT;
    }
  }

  return inDict
    ? DICT_START - Math.min(decr, DICT_MAX_DECR)
    : NONDICT_START - Math.min(decr, NONDICT_MAX_DECR);
}

const HANGUL_G = /[가-힣]/g;
function countHangul(s: string): number {
  return (s.match(HANGUL_G) ?? []).length;
}

/** 접미 용언 길이 내림차순 — longest-match. */
const NOUN_VERB_DESC = [...KO_NOUN_VERB_SUFFIXES].sort(
  (a, b) => b.length - a.length,
);

/**
 * 명사+하다/되다/시키다 류 용언에서 접미 용언을 떼어 명사 어간을 복원 (§#2).
 * "도출하였다"→"도출", "분석했다"→"분석", "평가되었다"→"평가".
 *
 * 과분리 가드: 남는 어간 한글 ≥2일 때만 분리. 부실하면(위하여→위, 말하다→말 = 1음절)
 * 이 접미는 건너뛰고 더 짧은 접미를 시도, 끝내 없으면 null(분리 안 함 → 기존대로 폐기).
 * 접미 사전이 하/되/시키 계열뿐이라 일반 동사(먹었다)는 매치되지 않는다.
 */
function extractNounStem(token: string): string | null {
  for (const suf of NOUN_VERB_DESC) {
    if (token.length > suf.length && token.endsWith(suf)) {
      const stem = token.slice(0, -suf.length);
      if (countHangul(stem) >= 2) return stem;
    }
  }
  return null;
}

/** 가드 없는 후행 조사 1회 제거 — 카운터 판정 전용(어간 추출 아님). */
function stripTrailingJosaRaw(s: string): string {
  for (const j of JOSA_DESC) {
    if (s.length > j.length && s.endsWith(j)) return s.slice(0, -j.length);
  }
  return s;
}

/** 기호·비문자 포함 토큰(i→, s×3s) → 노이즈. 유니코드 글자 기준이라 fallback 언어 안전. */
function hasStraySymbol(token: string): boolean {
  return NON_WORD.test(token);
}

/** 한글 없는 짧은 숫자+영문 단편(5px, 0s, F1) → 노이즈. 한글 포함 토큰은 면제. */
function isLatinDigitFragment(token: string): boolean {
  return (
    !hasHangul(token) &&
    token.length <= 4 &&
    HAS_DIGIT.test(token) &&
    hasLatin(token)
  );
}

/** 숫자+세는단위(1줄/2가지/3번) → 노이즈. 시간·물리 단위는 카운터 집합에 없어 보존. */
function isNumericCounter(token: string): boolean {
  const m = token.match(NUMERIC_HANGUL);
  if (!m) return false;
  return KO_NUMERIC_COUNTERS.has(stripTrailingJosaRaw(m[1]));
}

/** 한 토큰에 1차+노이즈+2차 필터를 적용해 살아남으면 정규화 키를, 아니면 null. */
function refine(
  raw: string,
  p: FilterProfile,
): { key: string; text: string; denominal: boolean } | null {
  let tok = raw;

  // 명사 어간 추출(§#2)을 조사 제거보다 **먼저** — "포함하는"의 "는"을 stripJosa가 조사로
  // 떼어 "포함하"가 되기 전에 "하는"을 잡아 "포함" 복원. (둘 다 강도 3+에서 켜짐)
  let denominal = false;
  if (p.removeVerbForms && hasHangul(tok)) {
    const stem = extractNounStem(tok);
    if (stem) {
      tok = stem;
      denominal = true;
    }
  }

  if (p.removeJosa && hasHangul(tok)) tok = stripJosa(tok);

  if (tok.length <= 1) return null; // 1글자 토큰 제외
  if (BARE_NUMBER.test(tok)) return null; // 맨숫자 제외
  if (JOSA_SET.has(tok)) return null; // 단독 조사 (구두점 분리로 독립 토큰화된 으로/에서 등) — 키워드 아님

  // ── 형태 노이즈 (문서 종류 무관, 토큰 형태 기준) ──
  if (hasStraySymbol(tok)) return null; // 기호·비문자 — 전 강도 항상
  if (p.removeLatinDigitFrag && isLatinDigitFragment(tok)) return null;
  if (p.removeNumericCounter && isNumericCounter(tok)) return null;
  // 영문 약어(KPI/ROI/AI 등)는 거르지 않는다 — 사전(판별 근거)이 없어 감점=근거 없는 차감.
  // 영문 기본 포함, 일반 영단어 노이즈는 사용자가 거름 (RULES.md §11/§C). 숫자단편(5px)만 위에서 제거.

  const norm = normalizeKey(tok);
  if (isStopword(tok, norm)) return null; // 기능어 — 전 강도 항상

  // 신호3(강도5): 1음절 의존명사+조사 제거 (것은/것을/등이). 진짜 1음절명사(돈을)는 보존.
  if (p.signal3Mono && MONO_PLUS_JOSA.test(tok) && KO_STOPWORDS.has(tok[0])) {
    return null;
  }

  // 용언 활용형(먹었다/객관적인 등)은 여기서 떨구지 않는다 — 명사 확률 모델이
  // 사전 보호 신호와 함께 가중 차감으로 판정(extractCandidates §명사확률).
  // denominal(명사+하다 복원 토큰)은 이미 명사 어간이라 차감 면제 신호로 넘긴다.
  return { key: norm, text: tok, denominal };
}

/** 제목 영역에 등장한 정규화 키 집합 (위치 가산점용). */
function titleKeys(body: string, p: FilterProfile): Set<string> {
  const region = body.slice(0, TITLE_REGION_CHARS);
  const keys = new Set<string>();
  for (const raw of splitTokens(region)) {
    const r = refine(raw, p);
    if (r) keys.add(r.key);
  }
  return keys;
}

/**
 * 추출 메인. 옵션에 따라 후보 칩 목록을 점수 내림차순으로 반환.
 * 가위질(상위 N만 노출)은 UI가 담당 — 여기선 전체 후보를 점수순으로만 정렬.
 */
export function extractCandidates(
  text: ExtractedText,
  opts: ExtractOptions,
): Candidate[] {
  const p = PROFILES[opts.strength];
  const parts = [text.body];
  if (opts.scope.tables && text.tables) parts.push(text.tables);
  let joined = parts.join("\n");
  if (p.dropUrl) joined = joined.replace(URL_RE, " "); // URL 통째 제거(강도5)

  const titles = titleKeys(text.body, p);

  // 정규화 키 → { 표시 텍스트(첫 등장), 빈도, denominal }. 신호1용 문서 토큰셋도 수집.
  // docTokens는 전 강도 수집 — 확률(hover %)은 강도 무관 동일, 채택만 임계가 가른다.
  const docTokens = new Set<string>();
  const counts = new Map<
    string,
    { text: string; freq: number; denominal: boolean }
  >();
  for (const raw of splitTokens(joined)) {
    docTokens.add(raw);
    const r = refine(raw, p);
    if (!r) continue;
    const existing = counts.get(r.key);
    if (existing) {
      existing.freq += 1;
      if (r.denominal) existing.denominal = true;
    } else {
      counts.set(r.key, { text: r.text, freq: 1, denominal: r.denominal });
    }
  }

  // 빈도 컷은 사용자 minFreq만 (§#3). 강도는 "명사 판별 엄격도"만 담당, 빈도 컷 안 함.
  const minFreq = opts.minFreq;
  const threshold = THRESHOLD[opts.strength];

  const out: Candidate[] = [];
  for (const [key, { text: t, freq, denominal }] of counts) {
    if (freq < minFreq) continue;
    // 명사 확률 모델(§nounProbability) — 사전 보호 + 가중 차감. 강도 = 채택 임계.
    const prob = nounProbability(t, freq, denominal, docTokens);
    if (prob < threshold) continue;
    // 정렬 점수("양", §정렬): (a·빈도 + b·길이 + 제목가산점) × (prob/100). RULES.md §13.
    //  - 길이는 글자수 상한(CAP) — raw면 base64 쓰레기가 독식, CAP으로 침몰.
    //  - prob 곱: 노이즈(흘리/것 prob≤50)는 빈도 높아도 반토막 → 후순위. 죽이진 않음(정렬만).
    const lenTerm = Math.min(charLen(t), SORT_LEN_CAP);
    const value =
      SORT_FREQ_WEIGHT * freq +
      SORT_LEN_WEIGHT * lenTerm +
      (titles.has(key) ? TITLE_BONUS : 0);
    const score = value * (prob / 100);
    out.push({ text: t, freq, score, prob });
  }

  // 점수 → 빈도 → 사전순 (완전 결정론적 정렬)
  out.sort(
    (a, b) =>
      b.score - a.score || b.freq - a.freq || a.text.localeCompare(b.text),
  );
  return out;
}
