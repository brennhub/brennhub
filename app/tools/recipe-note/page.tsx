import { toolMetadata } from "@/lib/seo";
import { RecipeNoteClientShell } from "./client-shell";

export const metadata = toolMetadata("recipe-note");

/**
 * 레시피 받아쓰기 — 입력 화면 (기획서 §2-1).
 * 열람은 `r/[key]`, 수정은 `edit/[key]`가 각각 server에서 D1을 읽는다.
 */
export default function RecipeNotePage() {
  return <RecipeNoteClientShell />;
}
