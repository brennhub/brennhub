/**
 * 키워드 추출 엔진 (기획서 §3 / C). 전부 사전 + 통계 — 환각 0, 동일 입력=동일 결과.
 *
 * 1차: 토큰화 → 조사 제거 → 1글자/맨숫자 제거
 * 형태 노이즈(문서 종류 무관, 항상 적용): 기호·비문자 / 숫자+영문 단편 / 숫자+세는단위
 * 2차: 불용어 + 명사 위주(용언 어미 제거, 옵션) + 점수화(빈도 + 위치 가산점 − 약어 감점)
 *
 * 노이즈 규칙은 전부 "토큰 형태" 기준 — 코드/산문 구분 없이 동일하게 처리.
 */

import { EN_STOPWORDS } from "./stopwords.en";
import {
  KO_JOSA,
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
import type { Candidate, ExtractOptions, ExtractedText } from "./types";

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
/** 약어성 토큰 점수 감점 (빈도가 지배 — 제외급 아닌 "하위 정렬"용). */
const SHORT_ABBREV_PENALTY = 1;

/** 조사 길이 내림차순 — 세는단위 뒤 조사 제거용(가드 없음: 카운터 판정 전용). */
const JOSA_DESC = [...KO_JOSA].sort((a, b) => b.length - a.length);

function isStopword(token: string, norm: string): boolean {
  return EN_STOPWORDS.has(norm) || KO_STOPWORDS.has(token);
}

/** 명사 위주 네거티브 필터: 용언 종결·연결 어미로 끝나면 명사가 아니라고 본다. */
function isVerbLike(token: string): boolean {
  return KO_VERB_ENDINGS.some(
    (e) => token.length > e.length && token.endsWith(e),
  );
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
  opts: ExtractOptions,
): { key: string; text: string } | null {
  let tok = raw;
  if (opts.removeJosa && hasHangul(tok)) tok = stripJosa(tok);

  if (tok.length <= 1) return null; // 1글자 토큰 제외
  if (BARE_NUMBER.test(tok)) return null; // 맨숫자 제외

  // ── 형태 노이즈 (문서 종류 무관, 항상 적용) ──
  if (hasStraySymbol(tok)) return null; // 기호·비문자
  if (isLatinDigitFragment(tok)) return null; // 숫자+영문 단편
  if (isNumericCounter(tok)) return null; // 숫자+세는단위

  const norm = normalizeKey(tok);
  if (isStopword(tok, norm)) return null;
  if (opts.nounFocus && hasHangul(tok) && isVerbLike(tok)) return null;

  return { key: norm, text: tok };
}

/** 제목 영역에 등장한 정규화 키 집합 (위치 가산점용). */
function titleKeys(body: string, opts: ExtractOptions): Set<string> {
  const region = body.slice(0, TITLE_REGION_CHARS);
  const keys = new Set<string>();
  for (const raw of splitTokens(region)) {
    const r = refine(raw, opts);
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
  const parts = [text.body];
  if (opts.scope.tables && text.tables) parts.push(text.tables);
  const joined = parts.join("\n");

  const titles = titleKeys(text.body, opts);

  // 정규화 키 → { 표시 텍스트(첫 등장), 빈도 }
  const counts = new Map<string, { text: string; freq: number }>();
  for (const raw of splitTokens(joined)) {
    const r = refine(raw, opts);
    if (!r) continue;
    const existing = counts.get(r.key);
    if (existing) existing.freq += 1;
    else counts.set(r.key, { text: r.text, freq: 1 });
  }

  const out: Candidate[] = [];
  for (const [key, { text: t, freq }] of counts) {
    if (freq < opts.minFreq) continue;
    // 빈도가 지배. 약어는 -1만 — 빈출 약어(MRI 등)는 상위에 살아남는다.
    let score = freq + (titles.has(key) ? TITLE_BONUS : 0);
    if (isShortAbbrev(t)) score -= SHORT_ABBREV_PENALTY;
    out.push({ text: t, freq, score });
  }

  // 점수 → 빈도 → 사전순 (완전 결정론적 정렬)
  out.sort(
    (a, b) =>
      b.score - a.score || b.freq - a.freq || a.text.localeCompare(b.text),
  );
  return out;
}
