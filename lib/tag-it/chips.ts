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
 * 최초 추출: 기존 keywords → 채택(주황) 프리셋, 추출 후보 → 후보 칩.
 * 기존 keyword는 처음부터 "선택한 태그" 구역에 채택 상태로, source:existing 으로 주황 구분.
 * (핀/보호 UI는 MVP에서 숨김 — 2차 슬라이더·올가미와 함께 부활. BACKLOG 참고.)
 * 기존 keyword와 겹치는 후보는 기존 칩 우선 (중복 생성 X).
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
      status: "selected",
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
      prob: c.prob,
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
      prob: c.prob,
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

// ── 일괄 선택 (변경 3) ──────────────────────────────────────────────
// 전부 순수 함수 — 입력 chips를 변형하지 않고 새 배열 반환. capped=상한에 걸렸는지.

const SELECT_CAP = TAG_IT_LIMITS.maxTagsPerFile;

function selectedCount(chips: Chip[]): number {
  return chips.filter((c) => c.status === "selected").length;
}

/** 후보 칩 id를 점수 내림차순(동점 시 사전순)으로 — 일괄 선택 우선순위. */
function rankedCandidateIds(chips: Chip[]): string[] {
  return chips
    .filter((c) => c.status === "candidate")
    .slice()
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text))
    .map((c) => c.id);
}

function applySelect(chips: Chip[], ids: Set<string>): Chip[] {
  return chips.map((c) =>
    ids.has(c.id) ? { ...c, status: "selected" } : c,
  );
}

/**
 * 후보를 점수순으로 limit개까지 채택. 선택 합계는 SELECT_CAP(50)를 넘지 않는다.
 * limit 미지정 = 전체 선택.
 */
export function selectCandidates(
  chips: Chip[],
  limit?: number,
): { chips: Chip[]; capped: boolean } {
  const ranked = rankedCandidateIds(chips);
  const slots = Math.max(0, SELECT_CAP - selectedCount(chips));
  const want = limit === undefined ? ranked.length : Math.max(0, limit);
  const take = Math.min(want, slots);
  const capped = ranked.length > slots && want > slots;
  const ids = new Set(ranked.slice(0, take));
  return { chips: applySelect(chips, ids), capped };
}

/**
 * 전체 해제 = 자동 추출(source:extracted) 채택분만 후보로 복귀.
 * 기존 keywords(existing, 주황)와 수동 입력(manual)은 사용자 자산이라 보존 (파괴 방지).
 */
export function deselectExtracted(chips: Chip[]): Chip[] {
  return chips.map((c) =>
    c.status === "selected" && c.source === "extracted"
      ? { ...c, status: "candidate" }
      : c,
  );
}
