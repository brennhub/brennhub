import { getRecipeDb } from "@/lib/recipe-note/db";
import { isValidEditToken, isValidKey, timingSafeEqual } from "@/lib/recipe-note/key";
import { validateRecipeInput } from "@/lib/recipe-note/record";

/**
 * 레시피 수정 API (기획서 §5).
 *
 * PUT /api/recipe-note/[key]  헤더 `x-edit-token`
 *   → 토큰 불일치 403 · 없는 레시피 404 · 성공 { ok: true }
 *
 * 로그인이 없으므로 이 토큰이 유일한 권한 증거다. 존재 여부와 권한 실패를
 * 구분해 응답하지만(사용자 안내가 달라야 하므로), 토큰 자체는 절대 돌려주지 않는다.
 *
 * Next.js 16 — `params`는 Promise다 (await 필수).
 * **`export const runtime = "edge"` 금지** (BRENNHUB.md §7).
 */

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    if (!isValidKey(key)) {
      return Response.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const token = req.headers.get("x-edit-token");
    if (!isValidEditToken(token)) {
      return Response.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON", code: "INVALID" },
        { status: 400 },
      );
    }

    const validated = validateRecipeInput(body);
    if (!validated.ok) {
      return Response.json(
        { error: validated.error.message, code: validated.error.code },
        { status: 400 },
      );
    }
    const recipe = validated.value;

    const db = getRecipeDb();
    if (!db) {
      return Response.json(
        { error: "Database unavailable", code: "DB_UNAVAILABLE" },
        { status: 500 },
      );
    }

    const row = await db
      .prepare(`SELECT edit_token FROM recipe_note_recipes WHERE "key" = ?`)
      .bind(key)
      .first<{ edit_token: string }>();
    if (!row) {
      return Response.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!timingSafeEqual(row.edit_token, token)) {
      return Response.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    await db
      .prepare(
        `UPDATE recipe_note_recipes
         SET title = ?, video_url = ?, channel = ?, ingredients = ?, steps = ?,
             updated_at = datetime('now')
         WHERE "key" = ?`,
      )
      .bind(
        recipe.title,
        recipe.videoUrl,
        recipe.channel,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.steps),
        key,
      )
      .run();

    return Response.json({ ok: true, key });
  } catch (err) {
    const e = err as Error;
    console.error("[recipe-note] update error:", e);
    return Response.json(
      { error: "Server error", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
