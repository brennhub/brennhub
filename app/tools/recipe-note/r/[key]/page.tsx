import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import { fetchRecipe } from "@/lib/recipe-note/db";
import { RecipeNotFound } from "../../components/recipe-not-found";
import { RecipeViewShell } from "./view-shell";

/**
 * 레시피 열람 (기획서 §2-2).
 *
 * 조회 API 없이 server에서 D1을 직접 읽는다 (기획서 §5 · Server Component 우선).
 * Next.js 16 — `params`는 Promise다.
 *
 * layout이 이미 force-dynamic이지만 D1을 읽는 페이지라 페이지 레벨에도 명시한다
 * (releases 페이지와 같은 판단 — 정적 프리렌더로 새는 경로를 원천 차단).
 */
export const dynamic = "force-dynamic";

/**
 * 레시피 제목은 사용자 데이터다 — 검색 노출 대상이 아니다.
 * `noindex`로 두고 제목만 탭에 띄운다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const recipe = await fetchRecipe(key);
  const t = messages[DEFAULT_LOCALE].recipeNote;
  return {
    title: recipe ? `${recipe.title} · ${t.title}` : t.notFoundTitle,
    robots: { index: false, follow: false },
  };
}

export default async function RecipeViewPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const recipe = await fetchRecipe(key);
  if (!recipe) return <RecipeNotFound />;
  return <RecipeViewShell recipe={recipe} />;
}
