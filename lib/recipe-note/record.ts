import type { Ingredient, Recipe, RecipeInput, Step } from "./types";
import { LIMITS } from "./types";
import { MAX_TIMER_SEC } from "./parse";

/**
 * 저장 레코드 검증 + D1 row 변환 (기획서 §3, §5).
 *
 * 클라이언트가 이미 파싱해 보내지만 서버가 **다시** 검증한다 — curl 등
 * 우회 경로가 열려 있기 때문(maze POST와 같은 판단). 순수 모듈이라
 * API route·server component 양쪽에서 쓴다.
 */

export type ValidationError = { code: string; message: string };

export type ValidationResult =
  | { ok: true; value: RecipeInput }
  | { ok: false; error: ValidationError };

function fail(code: string, message: string): ValidationResult {
  return { ok: false, error: { code, message } };
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

/**
 * 영상 URL은 http(s)만 통과시킨다. 이 값은 열람 화면에서 `href`로 나가므로
 * `javascript:` 스킴을 막지 않으면 그대로 스크립트 실행 경로가 된다.
 */
export function normalizeVideoUrl(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  if (raw.length > LIMITS.videoUrlMax) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeOptionalText(value: unknown, max: number): string | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  return raw.slice(0, max);
}

/** qtyText는 "범위 원문"만 담는 자리다 — 임의 문자열이 들어오면 버린다. */
const RANGE_TEXT = /^\d+(?:\.\d+)?\s*[~～\-–—]\s*\d+(?:\.\d+)?$/;

function normalizeIngredient(value: unknown): Ingredient | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const name = asTrimmedString(v.name);
  if (!name || name.length > LIMITS.textMax) return null;

  const qty =
    typeof v.qty === "number" && Number.isFinite(v.qty) && v.qty >= 0
      ? v.qty
      : null;

  // qtyText(범위)와 qty는 상호 배타 — 둘 다 오면 qty를 진실로 본다.
  const qtyTextRaw = qty === null ? asTrimmedString(v.qtyText) : null;
  const qtyText =
    qtyTextRaw && RANGE_TEXT.test(qtyTextRaw)
      ? qtyTextRaw.replace(/\s+/g, "")
      : null;

  // raw는 "수량으로 파싱 못 한 원문" 자리다. 확정 수량이 있으면 공존할 수 없다 —
  // 조작된 요청이 모델 불변식을 깨고 들어오는 것을 여기서 끊는다.
  const hasQuantity = qty !== null || qtyText !== null;

  return {
    name,
    qty,
    qtyText,
    unit: normalizeOptionalText(v.unit, LIMITS.textMax),
    raw: hasQuantity ? null : normalizeOptionalText(v.raw, LIMITS.textMax),
  };
}

function normalizeStep(value: unknown): Step | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const text = asTrimmedString(v.text);
  if (!text || text.length > LIMITS.textMax) return null;

  // 파서와 같은 상한을 건다 — 조작된 POST가 27만 시간짜리 타이머를 심지 못하게.
  const timerSec =
    typeof v.timerSec === "number" &&
    Number.isFinite(v.timerSec) &&
    v.timerSec > 0
      ? Math.min(Math.round(v.timerSec), MAX_TIMER_SEC)
      : null;

  return { text, timerSec };
}

/** POST/PUT 본문 검증. 실패 코드는 클라이언트가 안내 문구로 분기한다. */
export function validateRecipeInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return fail("INVALID", "Body must be an object");
  }
  const v = body as Record<string, unknown>;

  const title = asTrimmedString(v.title);
  if (!title) return fail("TITLE_REQUIRED", "Title is required");
  if (title.length > LIMITS.titleMax) {
    return fail("TITLE_TOO_LONG", `Title must be ${LIMITS.titleMax} chars or fewer`);
  }

  if (!Array.isArray(v.ingredients) || v.ingredients.length === 0) {
    return fail("INGREDIENTS_REQUIRED", "At least one ingredient is required");
  }
  if (v.ingredients.length > LIMITS.ingredientsMax) {
    return fail("TOO_MANY_INGREDIENTS", `Max ${LIMITS.ingredientsMax} ingredients`);
  }

  if (!Array.isArray(v.steps) || v.steps.length === 0) {
    return fail("STEPS_REQUIRED", "At least one step is required");
  }
  if (v.steps.length > LIMITS.stepsMax) {
    return fail("TOO_MANY_STEPS", `Max ${LIMITS.stepsMax} steps`);
  }

  const ingredients: Ingredient[] = [];
  for (const item of v.ingredients) {
    const normalized = normalizeIngredient(item);
    if (!normalized) return fail("INVALID_INGREDIENT", "Malformed ingredient");
    ingredients.push(normalized);
  }

  const steps: Step[] = [];
  for (const item of v.steps) {
    const normalized = normalizeStep(item);
    if (!normalized) return fail("INVALID_STEP", "Malformed step");
    steps.push(normalized);
  }

  return {
    ok: true,
    value: {
      title,
      videoUrl: normalizeVideoUrl(v.videoUrl),
      channel: normalizeOptionalText(v.channel, LIMITS.channelMax),
      ingredients,
      steps,
    },
  };
}

/** D1 row 형태 — 컬럼명은 migrations/auth/013_recipe_note.sql 그대로. */
export type RecipeRow = {
  key: string;
  title: string;
  video_url: string | null;
  channel: string | null;
  ingredients: string;
  steps: string;
  created_at: string;
  updated_at: string;
};

/**
 * D1 row → Recipe. 손상된 JSON은 조용히 빈 배열로 — 열람 화면이 500으로
 * 죽는 대신 "레시피를 찾을 수 없다"로 흐르게 한다.
 */
export function rowToRecipe(row: RecipeRow): Recipe | null {
  const ingredients = safeParseArray(row.ingredients, normalizeIngredient);
  const steps = safeParseArray(row.steps, normalizeStep);
  if (!ingredients || !steps) return null;

  return {
    key: row.key,
    title: row.title,
    // 저장 시 이미 검증했지만 읽을 때 한 번 더 건다 — 이 값은 곧바로 `href`가 된다.
    // row가 어떤 경로로 들어왔든 렌더 경로에서 http(s)가 아닌 스킴은 통과 못 한다.
    videoUrl: normalizeVideoUrl(row.video_url),
    channel: row.channel,
    ingredients,
    steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeParseArray<T>(
  json: string,
  normalize: (value: unknown) => T | null,
): T[] | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const out: T[] = [];
    for (const item of parsed) {
      const normalized = normalize(item);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return null;
  }
}
