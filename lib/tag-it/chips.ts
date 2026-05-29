/**
 * 칩 구성·병합 로직 (기획서 §4, §5.4 / D-2).
 * 재추출 시 사용자가 만든 칩(채택·보호·수동)은 보존 — "이미 만든 칩은 사용자 자산" (파괴 방지).
 */

import { TAG_IT_LIMITS } from "./limits";
import { normalizeKey } from "./tokenize";
import type { Candidate, Chip } from "./types";

/** 정규화 텍스트를 칩 id로 — 중복 판정의 단일 기준. */
export function chipId(text: string): string {
  return normalizeKey(text);
}

/** 사용자 자산으로 보존할 칩인가 (채택·보호·수동). */
function isUserChip(c: Chip): boolean {
  return (
    c.status === "selected" || c.status === "protected" || c.source === "manual"
  );
}

/**
 * 최초 추출: 기존 keywords → 보호(주황) 프리셋, 추출 후보 → 후보 칩.
 * 기존 keyword와 겹치는 후보는 보호 칩 우선 (중복 생성 X).
 */
export function buildInitialChips(
  candidates: Candidate[],
  existingKeywords: string[],
): Chip[] {
  const chips: Chip[] = [];
  const seen = new Set<string>();

  for (const kw of existingKeywords) {
    const text = kw.trim();
    if (!text) continue;
    const id = chipId(text);
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({
      id,
      text,
      status: "protected",
      score: 0,
      freq: 0,
      source: "existing",
    });
  }

  for (const c of candidates) {
    const id = chipId(c.text);
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({
      id,
      text: c.text,
      status: "candidate",
      score: c.score,
      freq: c.freq,
      source: "extracted",
    });
  }

  return chips;
}

/**
 * 옵션 변경 후 재추출: 사용자 칩은 그대로 두고 후보 칩만 새 추출로 교체.
 * 새 후보가 보존 칩과 겹치면 건너뛴다 (사용자 칩의 상태 유지).
 */
export function mergeReextract(prev: Chip[], candidates: Candidate[]): Chip[] {
  const kept = prev.filter(isUserChip);
  const keptIds = new Set(kept.map((c) => c.id));
  const out: Chip[] = [...kept];

  for (const c of candidates) {
    const id = chipId(c.text);
    if (keptIds.has(id)) continue;
    out.push({
      id,
      text: c.text,
      status: "candidate",
      score: c.score,
      freq: c.freq,
      source: "extracted",
    });
  }

  return out;
}

/**
 * 다운로드에 기록할 최종 태그 = 채택 + 보호 칩.
 * 글자수·개수 상한 적용 (core.xml keywords 현실 한계).
 */
export function finalTags(chips: Chip[]): string[] {
  return chips
    .filter((c) => c.status === "selected" || c.status === "protected")
    .map((c) => c.text.slice(0, TAG_IT_LIMITS.maxTagChars))
    .slice(0, TAG_IT_LIMITS.maxTagsPerFile);
}
