/**
 * POST /api/saju-naming/saju
 *
 * 입력: { year, month, day, hour, isLunar, minute?, longitude?, dst? }
 *   - hour: 0-23 또는 null (시간 미지 — 시주 미지 처리)
 *   - minute / longitude / dst: optional, 진태양시 보정 옵션 (default = 한국 표준 자동)
 * 출력: { saju: { 4기둥 + lunarDate + 진태양시 메타 }, ohaeng: OhaengAnalysis }
 *
 * 진태양시 default 적용 (DST·경도·균시차). 자세한 룰: lib/saju.ts.
 * 시간 미지(hour=null) 시 응답의 hour 필드는 null, trueSolar 필드는 omit.
 *
 * D1 의존 없음. 사주 4기둥 + 오행 분석 (용신/기신 포함)만 반환.
 * 한자 추천(/recommend)과 한자 조회(/hanja-search)는 별도 endpoint.
 */

import {
  calculateSaju,
  type Pillar,
  type SajuRelations,
  type SajuResult,
  type SajuSipsin,
  type TrueSolarMeta,
} from "@/app/tools/saju-naming/lib/saju";
import { analyzeOhaeng } from "@/app/tools/saju-naming/lib/ohaeng";

// runtime 명시 없음 — OpenNext + Cloudflare adapter는 edge runtime 미지원
// (다른 도구 패턴 일관). 자세한 경위는 CHANGELOG 0.6.1.

// ───────────────────────── 입력 검증 ─────────────────────────

interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  isLunar: boolean;
  minute?: number;
  longitude?: number;
  dst?: boolean | "auto";
}

type ValidationField = keyof SajuInput;
type ValidationError = { field: ValidationField; code: string };

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
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

  // hour: integer 0-23 또는 null (시간 미지)
  let hour: number | null;
  if (b.hour === null) {
    hour = null;
  } else if (isInt(b.hour) && inRange(b.hour, 0, 23)) {
    hour = b.hour;
  } else if (isInt(b.hour)) {
    return { field: "hour", code: "OUT_OF_RANGE" };
  } else {
    return { field: "hour", code: "INVALID_INPUT" };
  }

  if (typeof b.isLunar !== "boolean") {
    return { field: "isLunar", code: "INVALID_INPUT" };
  }

  // optional: minute 0-59
  let minute: number | undefined;
  if (b.minute !== undefined) {
    if (!isInt(b.minute)) return { field: "minute", code: "INVALID_INPUT" };
    if (!inRange(b.minute, 0, 59)) return { field: "minute", code: "OUT_OF_RANGE" };
    minute = b.minute;
  }

  // optional: longitude (동경 도, 실측 가능 범위 0~180; 실용 60~180)
  let longitude: number | undefined;
  if (b.longitude !== undefined) {
    if (!isFiniteNumber(b.longitude)) {
      return { field: "longitude", code: "INVALID_INPUT" };
    }
    if (!inRange(b.longitude, 0, 180)) {
      return { field: "longitude", code: "OUT_OF_RANGE" };
    }
    longitude = b.longitude;
  }

  // optional: dst — boolean 또는 "auto"
  let dst: boolean | "auto" | undefined;
  if (b.dst !== undefined) {
    if (b.dst === "auto" || typeof b.dst === "boolean") {
      dst = b.dst as boolean | "auto";
    } else {
      return { field: "dst", code: "INVALID_INPUT" };
    }
  }

  return {
    year: b.year,
    month: b.month,
    day: b.day,
    hour,
    isLunar: b.isLunar,
    minute,
    longitude,
    dst,
  };
}

// ───────────────────────── API 응답 매퍼 ─────────────────────────

interface ApiSaju {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 시간 미지(hour 입력 null) 시 null. */
  hour: Pillar | null;
  lunarDate: SajuResult["lunarDate"];
  /** 진태양시 보정 메타. 시간 미지 시 omit. */
  trueSolar?: TrueSolarMeta;
  /** 합충형파해 감지 결과 (B-2 P1, 표시만). */
  relations?: SajuRelations;
  /** 십신 (B-3-a, 표시만). */
  sipsin?: SajuSipsin;
}

function toApiSaju(r: SajuResult): ApiSaju {
  const hour: Pillar | null = "unknown" in r.hour ? null : r.hour;
  return {
    year: r.year,
    month: r.month,
    day: r.day,
    hour,
    lunarDate: r.lunarDate,
    ...(r.trueSolar ? { trueSolar: r.trueSolar } : {}),
    ...(r.relations ? { relations: r.relations } : {}),
    ...(r.sipsin ? { sipsin: r.sipsin } : {}),
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
      {
        minute: validated.minute,
        longitude: validated.longitude,
        dst: validated.dst,
      },
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
