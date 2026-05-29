/**
 * 키워드 추출 엔진 (기획서 §3 / C). 전부 사전 + 통계 — 환각 0, 동일 입력=동일 결과.
 *
 * 1차: 토큰화 → 조사 제거 → 불용어/1글자/맨숫자 제거
 * 2차: 명사 위주(네거티브 — 용언 어미 제거) + 점수화(빈도 + 위치 가산점) + 중복 병합
 */

import { EN_STOPWORDS } from "./stopwords.en";
import { KO_STOPWORDS, KO_VERB_ENDINGS } from "./stopwords.ko";
import {
  hasHangul,
  normalizeKey,
  splitTokens,
  stripJosa,
} from "./tokenize";
import type { Candidate, ExtractOptions, ExtractedText } from "./types";

const BARE_NUMBER = /^\d+$/;

/** 제목·도입부로 간주해 가산점을 줄 본문 앞부분 길이 */
const TITLE_REGION_CHARS = 120;
/** 제목 영역 등장 토큰 가산점 */
const TITLE_BONUS = 2;

function isStopword(token: string, norm: string): boolean {
  return EN_STOPWORDS.has(norm) || KO_STOPWORDS.has(token);
}

/** 명사 위주 네거티브 필터: 용언 종결·연결 어미로 끝나면 명사가 아니라고 본다. */
function isVerbLike(token: string): boolean {
  return KO_VERB_ENDINGS.some(
    (e) => token.length > e.length && token.endsWith(e),
  );
}

/** 한 토큰에 1차+2차 필터를 적용해 살아남으면 정규화 키를, 아니면 null 반환. */
function refine(
  raw: string,
  opts: ExtractOptions,
): { key: string; text: string } | null {
  let tok = raw;
  if (opts.removeJosa && hasHangul(tok)) tok = stripJosa(tok);

  if (tok.length <= 1) return null; // 1글자 토큰 제외
  if (BARE_NUMBER.test(tok)) return null; // 맨숫자 제외 (숫자+단위는 length>1로 통과)

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
    const score = freq + (titles.has(key) ? TITLE_BONUS : 0);
    out.push({ text: t, freq, score });
  }

  // 점수 → 빈도 → 사전순 (완전 결정론적 정렬)
  out.sort(
    (a, b) =>
      b.score - a.score || b.freq - a.freq || a.text.localeCompare(b.text),
  );
  return out;
}
