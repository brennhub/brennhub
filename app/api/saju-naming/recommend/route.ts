/**
 * POST /api/saju-naming/recommend
 *
 * 입력: { sungHanja, sungStroke, yongsin, gisin, nameLength, topN?, excludeChars? }
 * 출력: { candidates: NameCandidate[] }
 *
 * D1 (`NAMING_DB`) `hanja` 테이블에서 `inname_ok = 1` 한자 풀을 로드 후
 * `lib/names.ts`의 `recommendNames()`로 점수 정렬.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  recommendNames,
  type HanjaEntry,
  type NameCandidate,
} from "@/app/tools/saju-naming/lib/names";

// runtime 명시 없음 (다른 도구 패턴 일관 / CHANGELOG 0.6.1).

// ───────────────────────── 입력 검증 ─────────────────────────

const OHAENGS = ["목", "화", "토", "금", "수"] as const;
const TOP_N_MAX = 50;

interface RecommendInput {
  sungHanja: string;
  sungStroke: number;
  yongsin: string[];
  gisin: string[];
  nameLength: 1 | 2;
  topN: number;
  excludeChars?: string[];
}

type ValidationError = { field: string; code: string };

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isStringArrayOf(
  v: unknown,
  allowed: readonly string[],
): v is string[] {
  return (
    Array.isArray(v) &&
    v.every((x) => typeof x === "string" && allowed.includes(x))
  );
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function validate(body: unknown): RecommendInput | ValidationError {
  if (!body || typeof body !== "object") {
    return { field: "body", code: "INVALID_INPUT" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.sungHanja !== "string" || b.sungHanja.length === 0) {
    return { field: "sungHanja", code: "INVALID_INPUT" };
  }
  if (!isInt(b.sungStroke)) {
    return { field: "sungStroke", code: "INVALID_INPUT" };
  }
  if (b.sungStroke < 1 || b.sungStroke > 30) {
    return { field: "sungStroke", code: "OUT_OF_RANGE" };
  }

  if (!isStringArrayOf(b.yongsin, OHAENGS)) {
    return { field: "yongsin", code: "INVALID_INPUT" };
  }
  if (!isStringArrayOf(b.gisin, OHAENGS)) {
    return { field: "gisin", code: "INVALID_INPUT" };
  }

  if (b.nameLength !== 1 && b.nameLength !== 2) {
    return { field: "nameLength", code: "INVALID_INPUT" };
  }

  let topN = 5;
  if (b.topN !== undefined) {
    if (!isInt(b.topN)) return { field: "topN", code: "INVALID_INPUT" };
    if (b.topN < 1 || b.topN > TOP_N_MAX) {
      return { field: "topN", code: "OUT_OF_RANGE" };
    }
    topN = b.topN;
  }

  let excludeChars: string[] | undefined;
  if (b.excludeChars !== undefined) {
    if (!isStringArray(b.excludeChars)) {
      return { field: "excludeChars", code: "INVALID_INPUT" };
    }
    excludeChars = b.excludeChars;
  }

  return {
    sungHanja: b.sungHanja,
    sungStroke: b.sungStroke,
    yongsin: b.yongsin,
    gisin: b.gisin,
    nameLength: b.nameLength,
    topN,
    excludeChars,
  };
}

// ───────────────────────── D1 → HanjaEntry[] 매퍼 ─────────────────────────

type HanjaRow = {
  character: string;
  hangeul: string;
  stroke: number;
  ohaeng: string;
  meaning: string;
  frequency: number;
};

function rowToHanjaEntry(r: HanjaRow): HanjaEntry {
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

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const validated = validate(body);
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

  let dbResults: HanjaRow[];
  try {
    const result = await db
      .prepare(
        "SELECT character, hangeul, stroke, ohaeng, meaning, frequency FROM hanja WHERE inname_ok = 1",
      )
      .all<HanjaRow>();
    dbResults = result.results ?? [];
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

  try {
    const candidates: NameCandidate[] = recommendNames({
      sungHanja: validated.sungHanja,
      sungStroke: validated.sungStroke,
      yongsin: validated.yongsin,
      gisin: validated.gisin,
      nameLength: validated.nameLength,
      topN: validated.topN,
      excludeChars: validated.excludeChars,
      db: dbResults.map(rowToHanjaEntry),
    });
    return Response.json({ candidates });
  } catch (e) {
    const err = e as Error;
    console.error("[recommend] handler error:", err);
    return Response.json(
      {
        error: "Recommendation failed",
        code: "SERVER_ERROR",
        message: err?.message,
      },
      { status: 500 },
    );
  }
}
