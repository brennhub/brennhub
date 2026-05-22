import { SCHEMA_VERSION, type Glyph, type LanguageProject } from "./types";
import { isValidBitmap } from "./glyph";

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

/** localStorage에서 언어 프로젝트를 읽어 온다 (hydrate). */
export function loadProject(): LanguageProject {
  if (typeof window === "undefined") return emptyProject();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProject();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyProject();
  }
}

/** 언어 프로젝트를 localStorage에 저장한다 (persist). */
export function saveProject(project: LanguageProject): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // quota 초과/불가 — 세션 내 상태는 그대로 유지
  }
}
