/**
 * 추출 옵션 localStorage 영속 (기획서 §3.6 / D, supp-plan storage abstraction 참고).
 * 파일 내용은 절대 저장 안 함 — 옵션값(스위치·체크박스·숫자)만. 서버 무상태 원칙과 일관.
 * 재방문 시 마지막 설정으로 시작 → 로그인·서버 없이 "내 필터 기억" 효과.
 */

import {
  DEFAULT_EXTRACT_OPTIONS,
  type ExtractOptions,
  type FilterStrength,
  type ReadScope,
} from "./types";

// v1(removeJosa/nounFocus) → v2(strength). 구버전 값은 무시하고 기본 강도 3으로 1회 리셋.
const KEY = "tag-it:options:v2";

function toStrength(v: unknown): FilterStrength {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5
    ? v
    : DEFAULT_EXTRACT_OPTIONS.strength;
}

/** localStorage에서 옵션 로드. 손상·부재 시 기본값. SSR 안전. */
export function loadOptions(): ExtractOptions {
  if (typeof window === "undefined") return DEFAULT_EXTRACT_OPTIONS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_EXTRACT_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<ExtractOptions>;
    const scope: ReadScope = {
      body: true, // MVP: 본문 고정 ON (끌 수 없음)
      tables: parsed.scope?.tables ?? DEFAULT_EXTRACT_OPTIONS.scope.tables,
    };
    return {
      strength: toStrength(parsed.strength),
      minFreq:
        typeof parsed.minFreq === "number" && parsed.minFreq >= 1
          ? Math.floor(parsed.minFreq)
          : DEFAULT_EXTRACT_OPTIONS.minFreq,
      scope,
    };
  } catch {
    return DEFAULT_EXTRACT_OPTIONS;
  }
}

/** 옵션 저장. 실패는 조용히 무시 (프라이빗 모드 등). */
export function saveOptions(opts: ExtractOptions): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(opts));
  } catch {
    // localStorage 불가 환경 — 무시
  }
}
