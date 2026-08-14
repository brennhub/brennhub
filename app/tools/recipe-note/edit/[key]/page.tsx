import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import { fetchRecipe } from "@/lib/recipe-note/db";
import { RecipeNotFound } from "../../components/recipe-not-found";
import { RecipeEditShell } from "./edit-shell";

/**
 * 레시피 수정 (기획서 §2-4).
 *
 * 기존 데이터는 server에서 D1로 읽어 폼에 채운다. edit_token은 **클라이언트로
 * 내려보내지 않는다** — 브라우저가 이미 갖고 있고, 없으면 애초에 권한이 없다.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages[DEFAULT_LOCALE].recipeNote.editHeading,
  robots: { index: false, follow: false },
};

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const recipe = await fetchRecipe(key);
  if (!recipe) return <RecipeNotFound />;
  return <RecipeEditShell recipe={recipe} />;
}
