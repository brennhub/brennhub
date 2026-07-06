/**
 * /api/tools/[slug]/score — 게임별 랭킹(leaderboard). visit route 구조 복제, AUTH_DB.
 *
 * GET  (public): 상위 N (score DESC, 동점 created_at ASC) → { scores: [{ name, score, created_at }] }.
 * POST (public, 익명): body { name, score } 제출 → { ok: true }.
 *   - slug allowlist: tools-registry 파생 (미등록 = 400).
 *   - name: 제어문자 제거 + trim + 1~12자 (초과 시 slice). score: 정수 0~상한.
 *   - rate-limit: ip_hash + tool_slug + 30s 창 (feedback/maze 패턴, 게임별 스코프) — 캐주얼 남용 억제.
 *   ⚠️ 클라 제출 점수는 본질적으로 위조 가능 — 서버측 게임 검증은 범위 밖.
 *      rate-limit + 상한 + sanitize로 캐주얼 남용만 억제한다.
 *
 * runtime 명시 없음 (OpenNext + Cloudflare adapter 컨벤션 — BRENNHUB.md § 7).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { tools } from "@/lib/tools-registry";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const TOOL_SLUGS = new Set(tools.map((t) => t.slug));
const TOP_N = 10;
const MAX_NAME = 12;
const MAX_SCORE = 1_000_000; // 상식적 상한 — 터무니없는 값 거부.
const RATE_LIMIT_WINDOW_MS = 30_000;

type ScoreRow = { name: string; score: number; created_at: number };

function err(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** 제어문자(코드포인트 < 0x20, 그리고 DEL 0x7f) 제거 + trim + 길이 제한. 제어문자 정규식 회피. */
function sanitizeName(raw: string): string {
  const kept = Array.from(raw.trim()).filter((ch) => {
    const c = ch.codePointAt(0) ?? 0;
    return c >= 0x20 && c !== 0x7f;
  });
  // 코드포인트 단위로 자른다 — String.slice는 UTF-16 unit이라 astral 문자에서 lone surrogate 발생.
  return kept.slice(0, MAX_NAME).join("").trim();
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  try {
    const rows = await db
      .prepare(
        "SELECT name, score, created_at FROM game_scores WHERE tool_slug = ? " +
          "ORDER BY score DESC, created_at ASC LIMIT ?",
      )
      .bind(slug, TOP_N)
      .all<ScoreRow>();
    return Response.json({ scores: rows.results ?? [] });
  } catch (e) {
    console.error("[score GET] DB error:", e);
    return err(500, "Database query failed");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!TOOL_SLUGS.has(slug)) return err(400, "Unknown tool");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON");
  }
  const rawName = (body as { name?: unknown })?.name;
  const rawScore = (body as { score?: unknown })?.score;

  if (typeof rawName !== "string") return err(400, "Invalid name");
  const name = sanitizeName(rawName);
  if (name.length < 1) return err(400, "Invalid name");

  if (
    typeof rawScore !== "number" ||
    !Number.isInteger(rawScore) ||
    rawScore < 0 ||
    rawScore > MAX_SCORE
  ) {
    return err(400, "Invalid score");
  }

  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return err(500, "Auth not configured");

  const ipHeader =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0";
  const ipHash = await sha256Hex(ipHeader);
  const now = Date.now();

  try {
    const recent = await db
      .prepare(
        "SELECT created_at FROM game_scores WHERE ip_hash = ? AND tool_slug = ? AND created_at >= ? LIMIT 1",
      )
      .bind(ipHash, slug, now - RATE_LIMIT_WINDOW_MS)
      .first<{ created_at: number }>();
    if (recent) return err(429, "Too many submissions — wait a moment");

    await db
      .prepare(
        "INSERT INTO game_scores (tool_slug, name, score, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(slug, name, rawScore, now, ipHash)
      .run();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[score POST] DB error:", e);
    return err(500, "Database write failed");
  }
}
