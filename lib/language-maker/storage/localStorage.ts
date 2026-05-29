/**
 * 게스트(비로그인) storage — localStorage. schema migrate 보존.
 *
 * ⚠️ migrate는 이 경로(legacy device-local 데이터)에만 적용. D1 경로는 migrate 안 함
 *    (로그인 write가 항상 현 SCHEMA_VERSION 보장 — 구schema D1 저장 방지).
 */

import { SCHEMA_VERSION, type Glyph, type LanguageProject } from "../types";
import { isValidBitmap } from "../glyph";
import type { LanguageProjectStorage } from "./types";

const KEY = "brennhub-language-maker";

function emptyProject(): LanguageProject {
  return { schemaVersion: SCHEMA_VERSION, glyphs: [] };
}

/** 손상·이질 데이터를 걸러 유효한 글리프만 남긴다. */
function sanitizeGlyphs(value: unknown): Glyph[] {
  if (!Array.isArray(value)) return [];
  const out: Glyph[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const g = raw as Partial<Glyph>;
    if (
      typeof g.id === "string" &&
      typeof g.trigger === "string" &&
      isValidBitmap(g.bitmap)
    ) {
      out.push({ id: g.id, trigger: g.trigger, bitmap: g.bitmap });
    }
  }
  return out;
}

/**
 * 알 수 없는/상위 스키마는 안전 폐기 (supp-plan migrate 패턴).
 * V1이 첫 스키마라 마이그레이션 분기는 아직 없음 — 버전 불일치 = 폐기.
 */
function migrate(raw: unknown): LanguageProject {
  if (!raw || typeof raw !== "object") return emptyProject();
  const data = raw as { schemaVersion?: unknown; glyphs?: unknown };
  const version =
    typeof data.schemaVersion === "number" ? data.schemaVersion : 0;
  if (version !== SCHEMA_VERSION) return emptyProject();
  return { schemaVersion: SCHEMA_VERSION, glyphs: sanitizeGlyphs(data.glyphs) };
}

export class LocalStorageLanguageStorage implements LanguageProjectStorage {
  async getProject(): Promise<LanguageProject | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async saveProject(project: LanguageProject): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(project));
    } catch {
      // quota 초과/불가 — 세션 내 상태는 그대로 유지
    }
  }

  async clearProject(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
