/**
 * GET /api/saju-naming/hanja-search
 *
 * Query: hangeul?, ohaeng?, strokeMin?, strokeMax?, limit?, offset?
 * 응답: { results: HanjaEntry[], total: number }
 *
 * D1 (`NAMING_DB`) `hanja` 테이블에서 동적 WHERE 필터링 후 페이지네이션.
 * 정렬: frequency DESC, stroke ASC, character.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { HanjaEntry } from "@/app/tools/saju-naming/lib/names";

export const runtime = "edge";

// ───────────────────────── 입력 검증 ─────────────────────────

const OHAENGS = ["목", "화", "토", "금", "수"] as const;
const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;
const STROKE_MAX = 50;

interface SearchInput {
  hangeul?: string;
  ohaeng?: string;
  strokeMin?: number;
  strokeMax?: number;
  limit: number;
  offset: number;
}

type ValidationError = { field: string; code: string };

function parseIntParam(raw: string | null): number | null {
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || String(n) !== raw.trim()) return null;
  return n;
}

function validate(url: URL): SearchInput | ValidationError {
  const hangeul = url.searchParams.get("hangeul")?.trim() || undefined;
  const ohaeng = url.searchParams.get("ohaeng")?.trim() || undefined;

  if (ohaeng !== undefined && !OHAENGS.includes(ohaeng as (typeof OHAENGS)[number])) {
    return { field: "ohaeng", code: "INVALID_INPUT" };
  }

  const strokeMinRaw = url.searchParams.get("strokeMin");
  const strokeMaxRaw = url.searchParams.get("strokeMax");
  let strokeMin: number | undefined;
  let strokeMax: number | undefined;

  if (strokeMinRaw !== null) {
    const v = parseIntParam(strokeMinRaw);
    if (v === null) return { field: "strokeMin", code: "INVALID_INPUT" };
    if (v < 1 || v > STROKE_MAX) {
      return { field: "strokeMin", code: "OUT_OF_RANGE" };
    }
    strokeMin = v;
  }
  if (strokeMaxRaw !== null) {
    const v = parseIntParam(strokeMaxRaw);
    if (v === null) return { field: "strokeMax", code: "INVALID_INPUT" };
    if (v < 1 || v > STROKE_MAX) {
      return { field: "strokeMax", code: "OUT_OF_RANGE" };
    }
    strokeMax = v;
  }
  if (
    strokeMin !== undefined &&
    strokeMax !== undefined &&
    strokeMin > strokeMax
  ) {
    return { field: "strokeMin", code: "OUT_OF_RANGE" };
  }

  let limit = LIMIT_DEFAULT;
  const limitRaw = url.searchParams.get("limit");
  if (limitRaw !== null) {
    const v = parseIntParam(limitRaw);
    if (v === null) return { field: "limit", code: "INVALID_INPUT" };
    if (v < 1 || v > LIMIT_MAX) {
      return { field: "limit", code: "OUT_OF_RANGE" };
    }
    limit = v;
  }

  let offset = 0;
  const offsetRaw = url.searchParams.get("offset");
  if (offsetRaw !== null) {
    const v = parseIntParam(offsetRaw);
    if (v === null) return { field: "offset", code: "INVALID_INPUT" };
    if (v < 0) return { field: "offset", code: "OUT_OF_RANGE" };
    offset = v;
  }

  return { hangeul, ohaeng, strokeMin, strokeMax, limit, offset };
}

// ───────────────────────── D1 row → HanjaEntry 매퍼 ─────────────────────────

type HanjaRow = {
  character: string;
  hangeul: string;
  stroke: number;
  ohaeng: string;
  meaning: string;
  frequency: number;
};

function rowToEntry(r: HanjaRow): HanjaEntry {
  return {
    character: r.character,
    hangeul: r.hangeul,
    stroke: r.stroke,
    ohaeng: r.ohaeng,
    meaning: r.meaning,
    frequency: r.frequency,
  };
}

// ───────────────────────── handler ─────────────────────────

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);

  const validated = validate(url);
  if ("code" in validated) {
    return Response.json(
      {
        error:
          validated.code === "OUT_OF_RANGE" ? "Out of range" : "Invalid input",
        code: validated.code,
        field: validated.field,
      },
      { status: 400 },
    );
  }

  const { env } = getCloudflareContext();
  const db = (env as unknown as { NAMING_DB?: D1Database }).NAMING_DB;
  if (!db) {
    return Response.json(
      { error: "Database unavailable", code: "DB_UNAVAILABLE" },
      { status: 500 },
    );
  }

  // 동적 WHERE
  const conditions: string[] = ["inname_ok = 1"];
  const bindings: (string | number)[] = [];

  if (validated.hangeul) {
    conditions.push("hangeul = ?");
    bindings.push(validated.hangeul);
  }
  if (validated.ohaeng) {
    conditions.push("ohaeng = ?");
    bindings.push(validated.ohaeng);
  }
  if (validated.strokeMin !== undefined) {
    conditions.push("stroke >= ?");
    bindings.push(validated.strokeMin);
  }
  if (validated.strokeMax !== undefined) {
    conditions.push("stroke <= ?");
    bindings.push(validated.strokeMax);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countSql = `SELECT COUNT(*) AS n FROM hanja ${whereClause}`;
  const selectSql = `SELECT character, hangeul, stroke, ohaeng, meaning, frequency FROM hanja ${whereClause} ORDER BY frequency DESC, stroke ASC, character LIMIT ? OFFSET ?`;

  try {
    const [countRes, pageRes] = await Promise.all([
      db
        .prepare(countSql)
        .bind(...bindings)
        .first<{ n: number }>(),
      db
        .prepare(selectSql)
        .bind(...bindings, validated.limit, validated.offset)
        .all<HanjaRow>(),
    ]);

    const total = countRes?.n ?? 0;
    const results = (pageRes.results ?? []).map(rowToEntry);
    return Response.json({ results, total });
  } catch (e) {
    return Response.json(
      {
        error: "Database query failed",
        code: "DB_ERROR",
        message: (e as Error).message,
      },
      { status: 500 },
    );
  }
}
