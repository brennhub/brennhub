import { getRecipeDb } from "@/lib/recipe-note/db";
import { generateEditToken, generateKey } from "@/lib/recipe-note/key";
import { validateRecipeInput } from "@/lib/recipe-note/record";

/**
 * 레시피 생성 API (기획서 §5).
 *
 * POST /api/recipe-note { title, videoUrl?, channel?, ingredients, steps }
 *   → { ok: true, key, editToken }
 *
 * - D1 binding: `AUTH_DB` (별도 DB 미생성 정책 — migrations/auth/013_recipe_note.sql).
 * - 조회 API는 없다 — 열람/수정 page.tsx가 server에서 D1을 직접 읽는다.
 * - key 충돌 시 재시도 3회 (62^8 공간이라 사실상 0이지만 방어).
 * - Rate limit: 같은 IP 30초 1회. 기획서는 MVP 제외로 뒀으나, 로그인 없는
 *   공개 write 엔드포인트를 무제한으로 열어두지 않는다 — feedback/maze/
 *   game_scores와 동일 패턴 (BRENNHUB.md §6 "외부 기획서 필터").
 *
 * **`export const runtime = "edge"` 금지** — OpenNext Cloudflare adapter 미지원
 * (BRENNHUB.md §7). 명시 안 함 = Workers 환경 자동 처리.
 */

const RATE_LIMIT_WINDOW = "-30 seconds";
const KEY_RETRIES = 3;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

export async function POST(req: Request) {
  try {
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

    const ipHash = await sha256Hex(clientIp(req));
    const recent = await db
      .prepare(
        `SELECT id FROM recipe_note_recipes
         WHERE ip_hash = ? AND created_at >= datetime('now', ?)
         LIMIT 1`,
      )
      .bind(ipHash, RATE_LIMIT_WINDOW)
      .first<{ id: number }>();
    if (recent) {
      return Response.json(
        { error: "Rate limit", code: "RATE_LIMIT" },
        { status: 429 },
      );
    }

    const editToken = generateEditToken();
    const ingredients = JSON.stringify(recipe.ingredients);
    const steps = JSON.stringify(recipe.steps);

    let key = generateKey();
    let inserted = false;
    for (let attempt = 0; attempt < KEY_RETRIES; attempt += 1) {
      try {
        await db
          .prepare(
            `INSERT INTO recipe_note_recipes
               ("key", edit_token, title, video_url, channel, ingredients, steps, ip_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            key,
            editToken,
            recipe.title,
            recipe.videoUrl,
            recipe.channel,
            ingredients,
            steps,
            ipHash,
          )
          .run();
        inserted = true;
        break;
      } catch (e) {
        // UNIQUE 충돌만 재시도 — 다른 에러는 그대로 올린다.
        const msg = (e as Error).message ?? "";
        if (!msg.includes("UNIQUE") && !msg.includes("PRIMARY")) throw e;
        key = generateKey();
      }
    }
    if (!inserted) {
      return Response.json(
        { error: "Could not allocate key", code: "KEY_COLLISION" },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, key, editToken });
  } catch (err) {
    const e = err as Error;
    console.error("[recipe-note] create error:", e);
    return Response.json(
      { error: "Server error", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
