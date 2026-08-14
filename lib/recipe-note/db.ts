import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Recipe } from "./types";
import { rowToRecipe, type RecipeRow } from "./record";
import { isValidKey } from "./key";

/**
 * recipe-note D1 접근 (AUTH_DB).
 *
 * `AUTH_DB`는 cloudflare-env.d.ts(생성물)에 아직 없다 — repo 전역 관례대로
 * 인라인 캐스팅으로 집는다. 493KB 생성 파일 재생성은 이 task의 범위가 아니다
 * (BRENNHUB.md §7 / 다른 호출부와 동일).
 */

type RecipeNoteEnv = { AUTH_DB?: D1Database };

export function getRecipeDb(): D1Database | null {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as RecipeNoteEnv).AUTH_DB ?? null;
  } catch {
    return null;
  }
}

const SELECT_COLUMNS = `"key", title, video_url, channel, ingredients, steps, created_at, updated_at`;

/**
 * 숏링크 조회 — 열람·수정 page.tsx의 server fetch 경로 (기획서 §5:
 * "조회는 API 없이 page.tsx server에서 D1 직접 fetch").
 * 형식 불량·바인딩 없음·손상 row 모두 null 하나로 흐른다.
 */
export async function fetchRecipe(key: string): Promise<Recipe | null> {
  if (!isValidKey(key)) return null;

  const db = getRecipeDb();
  if (!db) return null;

  try {
    const row = await db
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM recipe_note_recipes WHERE "key" = ?`,
      )
      .bind(key)
      .first<RecipeRow>();
    if (!row) return null;
    return rowToRecipe(row);
  } catch (e) {
    console.error("[recipe-note] fetch error:", e);
    return null;
  }
}

// edit_token을 읽어 오는 헬퍼는 두지 않는다 — 수정 화면은 브라우저가 이미 가진
// 토큰으로 판정하고 진짜 검증은 PUT이 한다. server component가 쓸 수 있는 자리에
// 토큰 조회 경로를 만들어 두면 언젠가 응답에 실려 나간다.
