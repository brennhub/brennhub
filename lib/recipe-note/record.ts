import type {
  Ingredient,
  QtySelection,
  Recipe,
  RecipeInput,
  Step,
} from "./types";
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

/**
 * `sel` 검증. start/end는 조작 가능한 정수이고 렌더 시 그대로 slice에 들어가므로
 * 범위와 단위 정합성을 여기서 못 박는다. 어긋나면 레코드를 버리는 대신
 * `sel = null`로 떨어뜨린다 — 원문(`text`)은 언제나 살아남아야 한다.
 *
 * 저장된 sel을 `findQtyCandidates`로 재검증하지는 **않는다**. 수동 지정은
 * 정의상 후보 목록 밖이고, 재검증을 걸면 나중에 검출 규칙에 한 줄 추가하는
 * 순간 이미 저장된 레시피가 조용히 깨진다.
 */
function normalizeSelection(
  value: unknown,
  text: string,
): QtySelection | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const { start, end } = v;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  const s = start as number;
  const e = end as number;
  if (s < 0 || e > text.length || s >= e) return null;

  const unit = typeof v.unit === "string" ? v.unit : null;
  if (unit === null) return null;
  // 단위는 반드시 선택 구간의 꼬리여야 한다 — scale.ts의 구분자 복원이
  // `span.endsWith(unit)`에 기대고, 이게 깨지면 표시가 어긋난다.
  if (!text.slice(s, e).endsWith(unit)) return null;

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

  // 수량이 하나도 없는 선택은 의미가 없다.
  if (qty === null && qtyText === null) return null;

  return { start: s, end: e, qty, qtyText, unit };
}

function normalizeIngredient(value: unknown): Ingredient | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  // 공백 정규화는 클라이언트가 오프셋 계산 전에 이미 했다.
  // 여기서 다시 하면 오프셋이 밀린다 — trim만 한다.
  const text = asTrimmedString(v.text) ?? legacyText(v);
  if (!text || text.length > LIMITS.textMax) return null;

  const out: Ingredient = { text, sel: normalizeSelection(v.sel, text) };

  // optional/brand/store는 **필드 단위로만** 버린다. 하나가 이상해도 줄 전체를
  // 날리지 않는다 — 원문(text)은 언제나 살아남아야 한다는 불변식이 우선이다.
  // 값이 비면 키 자체를 넣지 않는다 (저장 JSON을 불리지 않으려고).
  if (v.optional === true) out.optional = true;
  const brand = optionalMeta(v.brand);
  if (brand) out.brand = brand;
  const store = optionalMeta(v.store);
  if (store) out.store = store;

  return out;
}

/** 브랜드·구입처 — 문자열 + 길이 상한만 본다. 어기면 그 필드만 버린다. */
function optionalMeta(value: unknown): string | null {
  const raw = asTrimmedString(value);
  if (!raw || raw.length > LIMITS.metaMax) return null;
  return raw;
}

/**
 * 구형식(`{name, qty, qtyText, unit, raw}`) 레코드 방어.
 *
 * 이 앱이 모델을 바꾸기 전에 저장된 행이 D1에 남아 있다. 되살릴 수 있는 건
 * 표시용 문자열뿐이므로 한 줄로 합쳐 `text`에 넣고 `sel`은 포기한다 —
 * 배율은 못 먹지만 사용자가 적은 글자는 화면에 그대로 나온다.
 */
function legacyText(v: Record<string, unknown>): string | null {
  const name = asTrimmedString(v.name);
  if (!name) return null;
  const amount =
    asTrimmedString(v.qtyText) ??
    (typeof v.qty === "number" ? String(v.qty) : null) ??
    asTrimmedString(v.raw);
  const unit = asTrimmedString(v.unit);
  return [name, amount, unit].filter(Boolean).join(" ").slice(0, LIMITS.textMax);
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
