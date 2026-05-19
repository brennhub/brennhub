/**
 * POST /api/saju-naming/saju
 *
 * 입력: { year, month, day, hour, isLunar }
 * 출력: { saju: { 4기둥 + lunarDate }, ohaeng: OhaengAnalysis }
 *
 * D1 의존 없음. 사주 4기둥 + 오행 분석 (용신/기신 포함)만 반환.
 * 한자 추천(/recommend)과 한자 조회(/hanja)는 한자 DB 적재 후 별도 endpoint.
 */

import { calculateSaju, type SajuResult } from "@/app/tools/saju-naming/lib/saju";
import { analyzeOhaeng } from "@/app/tools/saju-naming/lib/ohaeng";

// runtime 명시 없음 — OpenNext + Cloudflare adapter는 edge runtime 미지원
// (다른 도구 패턴 일관). 자세한 경위는 CHANGELOG 0.6.1.

// ───────────────────────── 입력 검증 ─────────────────────────

interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  isLunar: boolean;
}

type ValidationError = { field: keyof SajuInput; code: string };

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function inRange(n: number, lo: number, hi: number): boolean {
  return n >= lo && n <= hi;
}

function validate(body: unknown): SajuInput | ValidationError {
  if (!body || typeof body !== "object") {
    return { field: "year", code: "INVALID_INPUT" };
  }
  const b = body as Record<string, unknown>;

  if (!isInt(b.year)) return { field: "year", code: "INVALID_INPUT" };
  if (!inRange(b.year, 1000, 2050)) return { field: "year", code: "OUT_OF_RANGE" };

  if (!isInt(b.month)) return { field: "month", code: "INVALID_INPUT" };
  if (!inRange(b.month, 1, 12)) return { field: "month", code: "OUT_OF_RANGE" };

  if (!isInt(b.day)) return { field: "day", code: "INVALID_INPUT" };
  if (!inRange(b.day, 1, 31)) return { field: "day", code: "OUT_OF_RANGE" };

  if (!isInt(b.hour)) return { field: "hour", code: "INVALID_INPUT" };
  if (!inRange(b.hour, 0, 23)) return { field: "hour", code: "OUT_OF_RANGE" };

  if (typeof b.isLunar !== "boolean") {
    return { field: "isLunar", code: "INVALID_INPUT" };
  }

  return {
    year: b.year,
    month: b.month,
    day: b.day,
    hour: b.hour,
    isLunar: b.isLunar,
  };
}

// ───────────────────────── API 응답 매퍼 ─────────────────────────

function toApiSaju(r: SajuResult) {
  return {
    year: r.year,
    month: r.month,
    day: r.day,
    hour: r.hour,
    lunarDate: r.lunarDate,
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
        error: validated.code === "OUT_OF_RANGE" ? "Out of range" : "Invalid input",
        code: validated.code,
        field: validated.field,
      },
      { status: 400 },
    );
  }

  try {
    const saju = calculateSaju(
      validated.year,
      validated.month,
      validated.day,
      validated.hour,
      validated.isLunar,
    );
    const ohaeng = analyzeOhaeng(saju.ohaeng);
    return Response.json({
      saju: toApiSaju(saju),
      ohaeng,
    });
  } catch (err) {
    const e = err as Error;
    console.error("[saju] handler error:", e);
    return Response.json(
      {
        error: "Calculation failed",
        code: "SERVER_ERROR",
        message: e?.message,
      },
      { status: 500 },
    );
  }
}
