import type { Messages } from "@/lib/i18n/messages";
import { LIMITS, type RecipeInput } from "./types";

/**
 * 저장 실패 안내 매핑 — 입력 화면과 수정 화면이 공유한다.
 *
 * 컴포넌트 파일이 아니라 여기 두는 이유: 수정 화면이 입력 화면 모듈을 import하면
 * 쓰지도 않는 입력 셸 전체가 수정 라우트 번들에 딸려 들어간다.
 */

/**
 * 서버 코드 → 사용자 문구. 모르는 코드는 일반 안내로 흡수한다.
 *
 * "너무 많다"와 "안 적었다"는 반드시 다른 문구여야 한다 — 41단계를 적은
 * 사람에게 "순서를 하나 이상 적어주세요"라고 답하면 무엇을 고쳐야 할지 알 수 없다.
 */
export function errorMessageFor(
  code: string | undefined,
  t: Messages["recipeNote"],
): string {
  switch (code) {
    case "TITLE_REQUIRED":
      return t.errorTitleRequired;
    case "INGREDIENTS_REQUIRED":
      return t.errorIngredientsRequired;
    case "STEPS_REQUIRED":
      return t.errorStepsRequired;
    case "TOO_MANY_INGREDIENTS":
      return t.errorTooManyIngredients.replace(
        "{max}",
        String(LIMITS.ingredientsMax),
      );
    case "TOO_MANY_STEPS":
      return t.errorTooManySteps.replace("{max}", String(LIMITS.stepsMax));
    case "TITLE_TOO_LONG":
      return t.errorTextTooLong.replace("{max}", String(LIMITS.titleMax));
    case "INVALID_INGREDIENT":
    case "INVALID_STEP":
      return t.errorTextTooLong.replace("{max}", String(LIMITS.textMax));
    case "RATE_LIMIT":
      return t.errorRateLimit;
    default:
      return t.errorGeneric;
  }
}

/** 네트워크를 태우기 전에 거를 수 있는 것은 여기서 거른다. */
export function localValidationCode(input: RecipeInput): string | null {
  if (!input.title) return "TITLE_REQUIRED";
  if (input.ingredients.length === 0) return "INGREDIENTS_REQUIRED";
  if (input.steps.length === 0) return "STEPS_REQUIRED";
  return null;
}
