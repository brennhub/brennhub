import { isValidEditToken, isValidKey } from "./key";

/**
 * "내 레시피" 로컬 보관 (기획서 §2-1).
 *
 * 로그인이 없는 도구라 **수정 권한 = editToken 보유**다. 이 파일이 그 토큰의
 * 유일한 보관소이므로, 브라우저 데이터를 지우면 수정 권한도 사라진다.
 * 클라우드 동기화는 BACKLOG — 지금은 그 한계를 문서로 정직하게 남긴다.
 *
 * PATTERNS.md의 hydrate/persist + schemaVersion 패턴.
 */

const STORAGE_KEY = "brennhub-recipe-note-mine";
const SCHEMA_VERSION = 1;
/** 목록 상한 — 로컬 저장소를 무한정 키우지 않는다. 오래된 것부터 밀려난다. */
const MAX_ENTRIES = 50;

export type MyRecipe = {
  key: string;
  title: string;
  editToken: string;
  savedAt: number;
};

type StoredShape = {
  schemaVersion: number;
  entries: MyRecipe[];
};

function isMyRecipe(value: unknown): value is MyRecipe {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    isValidKey(v.key) &&
    isValidEditToken(v.editToken) &&
    typeof v.title === "string" &&
    typeof v.savedAt === "number"
  );
}

/** 손상·구 schema는 조용히 빈 목록으로. 읽기 실패가 화면을 깨지 않게 한다. */
export function loadMyRecipes(): MyRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const shape = parsed as Partial<StoredShape>;
    if (shape.schemaVersion !== SCHEMA_VERSION) return [];
    if (!Array.isArray(shape.entries)) return [];
    return shape.entries.filter(isMyRecipe);
  } catch {
    return [];
  }
}

function persist(entries: MyRecipe[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredShape = {
      schemaVersion: SCHEMA_VERSION,
      entries: entries.slice(0, MAX_ENTRIES),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 용량 초과·시크릿 모드 — 저장 실패가 저장 플로우를 막지는 않는다.
  }
}

/** 같은 key는 갱신, 새 항목은 맨 앞 (최근 저장 먼저). */
export function rememberMyRecipe(entry: MyRecipe): MyRecipe[] {
  const rest = loadMyRecipes().filter((e) => e.key !== entry.key);
  const next = [entry, ...rest].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function forgetMyRecipe(key: string): MyRecipe[] {
  const next = loadMyRecipes().filter((e) => e.key !== key);
  persist(next);
  return next;
}

/** 열람·수정 화면의 소유자 판정 — 이 기기에 토큰이 있는가. */
export function findEditToken(key: string): string | null {
  return loadMyRecipes().find((e) => e.key === key)?.editToken ?? null;
}
