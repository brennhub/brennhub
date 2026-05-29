import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateShortId, isValidPayload } from "@/lib/maze/share";
import { validateMaze } from "@/lib/maze/validate";
import type { MazeProject } from "@/lib/maze/types";

/**
 * 미로 숏링크 공유 API (P4a 0.14.0).
 *
 * POST /api/maze { project: MazeProject } → { ok: true, id: "abc123" }
 *
 * - D1 binding: `MAZE_DB` (wrangler.jsonc — prod + env.preview 양쪽 명시 필요).
 * - 검증: `isValidPayload` — migrate 통과 가능한지 + grid 비어있지 않은지.
 *   클라이언트가 validation.ok 게이팅하지만 서버 추가 검증 (curl 등 우회 차단).
 * - 충돌 시 1회 retry — 36^6 ≈ 2.2B 공간이라 사실상 0이지만 방어.
 * - Rate limit: 같은 IP 30s 내 1회. feedback API 패턴 응용.
 *
 * **`export const runtime = "edge"` 금지** — OpenNext Cloudflare adapter 미지원
 * (BRENNHUB.md §7). 명시 안 함 = Workers 환경 자동 처리.
 */

const RATE_LIMIT_WINDOW_MS = 30_000;
/** 숏링크 payload size 상한 — 128×128 미로 JSON ~600KB 추정, 여유 1MB. */
const MAX_PAYLOAD_BYTES = 1024 * 1024;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const project = (body as { project?: unknown })?.project;
    if (!isValidPayload(project)) {
      return Response.json(
        { error: "Invalid maze payload", code: "INVALID_PAYLOAD" },
        { status: 400 },
      );
    }

    // 완주성 검증 — 구조 검증(isValidPayload)만으론 crafted POST로 비-완주 미로가
    // 들어올 수 있음. 클라이언트 ShareControls는 validation.ok 시만 버튼 노출하지만,
    // curl 등 우회 가능. validateMaze는 순수 함수(BFS)라 server에서 호출 가능 —
    // plan Q2의 "깨진 미로 차단"이 서버에서 실제로 강제되게.
    const validation = validateMaze((project as MazeProject).grid);
    if (!validation.ok) {
      return Response.json(
        { error: "Maze not completable", code: "INCOMPLETE" },
        { status: 400 },
      );
    }

    const payload = JSON.stringify(project);
    if (payload.length > MAX_PAYLOAD_BYTES) {
      return Response.json(
        { error: "Payload too large", code: "TOO_LARGE" },
        { status: 413 },
      );
    }

    const { env } = getCloudflareContext();
    const db = (env as unknown as { MAZE_DB?: D1Database }).MAZE_DB;
    if (!db) {
      return Response.json(
        { error: "Database unavailable", code: "DB_UNAVAILABLE" },
        { status: 500 },
      );
    }

    // Rate limit — IP 해시 기반. 30초 윈도 안 같은 IP는 차단 (feedback 패턴 응용).
    const ipHeader =
      req.headers.get("CF-Connecting-IP") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";
    const ipHash = await sha256Hex(ipHeader);
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const recent = await db
      .prepare(
        "SELECT created_at FROM maze WHERE ip_hash = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
      )
      .bind(ipHash, windowStart)
      .first<{ created_at: number }>();
    if (recent) {
      return Response.json(
        { error: "Rate limit", code: "RATE_LIMIT" },
        { status: 429 },
      );
    }

    // 충돌 시 1회 retry. 36^6 = ~2.2B 공간이라 사실상 0.
    let id = generateShortId();
    let inserted = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await db
          .prepare(
            "INSERT INTO maze (short_id, payload, created_at, ip_hash) VALUES (?, ?, ?, ?)",
          )
          .bind(id, payload, now, ipHash)
          .run();
        inserted = true;
        break;
      } catch (e) {
        // PRIMARY KEY 충돌 시 retry — 다른 에러는 throw.
        const msg = (e as Error).message ?? "";
        if (!msg.includes("UNIQUE") && !msg.includes("PRIMARY")) throw e;
        id = generateShortId();
      }
    }
    if (!inserted) {
      return Response.json(
        { error: "Could not allocate id", code: "ID_COLLISION" },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, id });
  } catch (err) {
    const e = err as Error;
    console.error("[maze share] handler error:", e);
    return Response.json(
      { error: "Server error", code: "SERVER_ERROR", message: e?.message },
      { status: 500 },
    );
  }
}
