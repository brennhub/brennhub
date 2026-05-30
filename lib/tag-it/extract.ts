/**
 * 키워드 추출 엔진 (기획서 §3 / C). 전부 사전 + 통계 — 환각 0, 동일 입력=동일 결과.
 *
 * 1차: 토큰화 → (강도 3+) 조사 제거 → 1글자/맨숫자 제거
 * 형태 노이즈(문서 종류 무관): 기호·비문자(항상) / 숫자+영문 단편 / 숫자+세는단위 — 강도별 게이트
 * 2차: 불용어(항상) + 용언 어미 제거(강도 3+) + 점수화(빈도 + 위치 가산점 − 약어 감점)
 *
 * 노이즈 규칙은 전부 "토큰 형태" 기준 — 코드/산문 구분 없이 동일하게 처리.
 * 활성 필터는 필터 강도(1~5)가 결정 (PROFILES).
 */

import { EN_STOPWORDS } from "./stopwords.en";
import {
  KO_JOSA,
  KO_NOUN_VERB_SUFFIXES,
  KO_NUMERIC_COUNTERS,
  KO_STOPWORDS,
  KO_VERB_ENDINGS,
} from "./stopwords.ko";
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

/** 제목·도입부로 간주해 가산점을 줄 본문 앞부분 길이 */
const TITLE_REGION_CHARS = 120;
/** 제목 영역 등장 토큰 가산점 */
const TITLE_BONUS = 2;

/**
 * 필터 강도(1~5) → 활성 필터 프로파일. 기호·비문자 제거와 불용어 제거는 전 강도 항상.
 *   1 관대  : 기호만
 *   2       : + 숫자영문단편
 *   3 균형  : + 조사·활용형·숫자카운터 (기존 "명사 위주 ON" 수준)
 *   4       : + 약어 감점 강화
 *   5 엄격  : + 짧은 영문(약어) 제외
 * 빈도 컷(minFreq)은 강도와 분리 — 사용자 옵션만 (§#3). 강도는 빈도 컷 안 함.
 */
type FilterProfile = {
  removeJosa: boolean;
  removeVerbForms: boolean;
  removeLatinDigitFrag: boolean;
  removeNumericCounter: boolean;
  dropShortLatin: boolean;
  abbrevPenalty: number;
};

const PROFILES: Record<FilterStrength, FilterProfile> = {
  1: {
    removeJosa: false,
    removeVerbForms: false,
    removeLatinDigitFrag: false,
    removeNumericCounter: false,
    dropShortLatin: false,
    abbrevPenalty: 0,
  },
  2: {
    removeJosa: false,
    removeVerbForms: false,
    removeLatinDigitFrag: true,
    removeNumericCounter: false,
    dropShortLatin: false,
    abbrevPenalty: 0,
  },
  3: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropShortLatin: false,
    abbrevPenalty: 1,
  },
  4: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropShortLatin: false,
    abbrevPenalty: 2,
  },
  5: {
    removeJosa: true,
    removeVerbForms: true,
    removeLatinDigitFrag: true,
    removeNumericCounter: true,
    dropShortLatin: true,
    abbrevPenalty: 3,
  },
};

/** 조사 길이 내림차순 — 세는단위 뒤 조사 제거용(가드 없음: 카운터 판정 전용). */
const JOSA_DESC = [...KO_JOSA].sort((a, b) => b.length - a.length);

function isStopword(token: string, norm: string): boolean {
  return EN_STOPWORDS.has(norm) || KO_STOPWORDS.has(token);
}

/** 네거티브 필터(강도 3+): 용언 종결·연결 어미로 끝나면 명사가 아니라고 본다. */
function isVerbLike(token: string): boolean {
  return KO_VERB_ENDINGS.some(
    (e) => token.length > e.length && token.endsWith(e),
  );
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

/** 약어성: 한글 없음 + 길이 ≤3 + 숫자 없음 (gd/dps/int/MRI). 제외 X, 점수만 감점. */
function isShortAbbrev(token: string): boolean {
  return !hasHangul(token) && token.length <= 3 && !HAS_DIGIT.test(token);
}

/** 한 토큰에 1차+노이즈+2차 필터를 적용해 살아남으면 정규화 키를, 아니면 null. */
function refine(
  raw: string,
  p: FilterProfile,
): { key: string; text: string } | null {
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

  // ── 형태 노이즈 (문서 종류 무관, 토큰 형태 기준) ──
  if (hasStraySymbol(tok)) return null; // 기호·비문자 — 전 강도 항상
  if (p.removeLatinDigitFrag && isLatinDigitFragment(tok)) return null;
  if (p.removeNumericCounter && isNumericCounter(tok)) return null;
  if (p.dropShortLatin && isShortAbbrev(tok)) return null; // 엄격(5): 약어 제외

  const norm = normalizeKey(tok);
  if (isStopword(tok, norm)) return null; // 기능어 — 전 강도 항상

  // 명사 어간 없는 순수 용언만 폐기 (먹었다 등). 명사 복원된 토큰은 통과.
  if (!denominal && p.removeVerbForms && hasHangul(tok) && isVerbLike(tok)) {
    return null;
  }

  return { key: norm, text: tok };
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
  const joined = parts.join("\n");

  const titles = titleKeys(text.body, p);

  // 정규화 키 → { 표시 텍스트(첫 등장), 빈도 }
  const counts = new Map<string, { text: string; freq: number }>();
  for (const raw of splitTokens(joined)) {
    const r = refine(raw, p);
    if (!r) continue;
    const existing = counts.get(r.key);
    if (existing) existing.freq += 1;
    else counts.set(r.key, { text: r.text, freq: 1 });
  }

  // 빈도 컷은 사용자 minFreq만 (§#3). 강도는 "명사 판별 엄격도"만 담당, 빈도 컷 안 함.
  const minFreq = opts.minFreq;

  const out: Candidate[] = [];
  for (const [key, { text: t, freq }] of counts) {
    if (freq < minFreq) continue;
    // 빈도가 지배. 약어는 강도별 감점만 — 빈출 약어(MRI 등)는 상위에 살아남는다.
    let score = freq + (titles.has(key) ? TITLE_BONUS : 0);
    if (isShortAbbrev(t)) score -= p.abbrevPenalty;
    out.push({ text: t, freq, score });
  }

  // 점수 → 빈도 → 사전순 (완전 결정론적 정렬)
  out.sort(
    (a, b) =>
      b.score - a.score || b.freq - a.freq || a.text.localeCompare(b.text),
  );
  return out;
}
