/**
 * Hub 메인 페이지 카테고리 헬퍼.
 * - CATEGORY_ORDER: 섹션 노출 순서 (실용 → 즐거움).
 * - groupByCategory: registry → 카테고리별 묶음.
 * - isNew: createdAt 기준 NEW 배지 여부.
 *
 * 라벨은 i18n (`hub.categories.*`)에서 가져옴 — 본 파일은 분류·정렬 로직만.
 */

import type { Tool, ToolCategory } from "@/lib/tools-registry";

export const CATEGORY_ORDER: readonly ToolCategory[] = [
  "utility",
  "finance",
  "health",
  "lifestyle",
  "entertainment",
] as const;

export function groupByCategory(tools: Tool[]): Map<ToolCategory, Tool[]> {
  const groups = new Map<ToolCategory, Tool[]>();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const tool of tools) {
    const bucket = groups.get(tool.category);
    if (bucket) bucket.push(tool);
  }
  return groups;
}

const NEW_WINDOW_DAYS = 7;

export function isNew(createdAt: string, now: number = Date.now()): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= NEW_WINDOW_DAYS;
}
