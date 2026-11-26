import Link from "next/link";
import { messages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

/**
 * 열람·수정 조회 실패 fallback (기획서 §2-2, §2-4).
 *
 * 잘못된 키·삭제된 레시피·손상 데이터·바인딩 없음을 한 화면으로 흡수한다.
 * `notFound()` 대신 전용 화면인 이유는 maze와 같다 — 사용자에게는 전부
 * "링크가 안 열린다" 하나이고, 도구로 돌아갈 길이 보여야 한다.
 *
 * server component라 `useMessages()` 사용 불가 — messages 직접 import + DEFAULT_LOCALE.
 */
export function RecipeNotFound({ forbidden = false }: { forbidden?: boolean }) {
  const t = messages[DEFAULT_LOCALE].recipeNote;
  return (
    <main className="mx-auto w-full max-w-md px-6 pt-20 pb-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {forbidden ? t.forbiddenTitle : t.notFoundTitle}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {forbidden ? t.forbiddenBody : t.notFoundBody}
      </p>
      <div className="mt-6">
        <Link
          href="/tools/recipe-note"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t.notFoundBack}
        </Link>
      </div>
    </main>
  );
}
