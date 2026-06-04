/**
 * /api/saju-naming/saju 통합 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/saju-api.test.ts
 *
 * route handler를 직접 import해서 표준 Request로 호출. wrangler dev 불필요.
 * POC 케이스 (1979-05-29 05:00 양력) 와 동등 결과 확인.
 */

import assert from "node:assert/strict";
import { POST } from "../../../api/saju-naming/saju/route";

type ApiResponse = {
  saju: {
    year: { label: string };
    month: { label: string };
    day: { label: string };
    hour: { label: string } | null; // 시간 미지 시 null (진태양시 격상)
    lunarDate: {
      year: number;
      month: number;
      day: number;
      intercalation: boolean;
    };
    // balance/deficient/excessive는 응답에 없어야 함 (ohaeng 객체로 분리)
    balance?: unknown;
    deficient?: unknown;
    excessive?: unknown;
  };
  ohaeng: {
    balance: Record<string, number>;
    deficient: string[];
    excessive: string[];
    yongsin: string[];
    gisin: string[];
    nameDirection: string;
  };
};

async function callApi(body: unknown): Promise<{
  status: number;
  data: unknown;
}> {
  const req = new Request("http://localhost/api/saju-naming/saju", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const data = await res.json();
  return { status: res.status, data };
}

const failures: string[] = [];

function check(label: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  }
}

async function run() {
  // ─── 케이스 1: POC 동등 입력 ───
  const ok = await callApi({
    year: 1979,
    month: 5,
    day: 29,
    hour: 5,
    isLunar: false,
  });
  check("200 OK", ok.status === 200, `status=${ok.status}`);

  const r = ok.data as ApiResponse;

  // 4기둥
  check("saju.year.label === 기미", r.saju?.year?.label === "기미", r.saju?.year?.label);
  // 입춘+12절기 격상 후: OLD(라이브러리 음력) '경오' → NEW(입하 1979-05-06 11:47 이후 巳월) '기사'.
  check("saju.month.label === 기사 (절기 기준)", r.saju?.month?.label === "기사", r.saju?.month?.label);
  check("saju.day.label === 병신", r.saju?.day?.label === "병신", r.saju?.day?.label);
  // 진태양시 격상 후: OLD '신묘' → NEW '경인' (보정 ~-29분 → 04:31 진태양시 → 寅時·경).
  check("saju.hour.label === 경인 (진태양시)", r.saju?.hour?.label === "경인", r.saju?.hour?.label);

  // lunarDate
  assert.deepStrictEqual(r.saju.lunarDate, {
    year: 1979,
    month: 5,
    day: 4,
    intercalation: false,
  });

  // schema 분리: saju 객체엔 balance/deficient/excessive 없음
  check("saju.balance 미존재", r.saju.balance === undefined);
  check("saju.deficient 미존재", r.saju.deficient === undefined);
  check("saju.excessive 미존재", r.saju.excessive === undefined);

  // 입춘+12절기 격상 후: 月柱 庚午→己巳 → 금 -1, 토 +1.
  // 외숙모 사주: 목1 화2 토3 금2 수0
  assert.deepStrictEqual(r.ohaeng.balance, {
    목: 1,
    화: 2,
    토: 3,
    금: 2,
    수: 0,
  });
  assert.deepStrictEqual(r.ohaeng.deficient, ["수"]);
  assert.deepStrictEqual(r.ohaeng.excessive, ["토"]);
  check("yongsin 수 포함", r.ohaeng.yongsin.includes("수"));
  check("yongsin 토 미포함 (기신 우선)", !r.ohaeng.yongsin.includes("토"));
  check("gisin 토 포함", r.ohaeng.gisin.includes("토"));
  check("nameDirection 문자열", typeof r.ohaeng.nameDirection === "string");

  // ─── 케이스 2: 잘못된 JSON ───
  const reqBad = new Request("http://localhost/api/saju-naming/saju", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  const resBad = await POST(reqBad);
  check("400 INVALID_JSON", resBad.status === 400);
  const badData = (await resBad.json()) as { code?: string };
  check("code === INVALID_JSON", badData.code === "INVALID_JSON", badData.code);

  // ─── 케이스 3: 범위 위반 (year < 1000) ───
  const oor = await callApi({
    year: 999,
    month: 1,
    day: 1,
    hour: 0,
    isLunar: false,
  });
  check("400 OUT_OF_RANGE", oor.status === 400);
  const oorData = oor.data as { code?: string; field?: string };
  check("code === OUT_OF_RANGE", oorData.code === "OUT_OF_RANGE", oorData.code);
  check("field === year", oorData.field === "year", oorData.field);

  // ─── 케이스 4: 타입 불일치 (hour 문자열) ───
  const wrongType = await callApi({
    year: 1979,
    month: 5,
    day: 29,
    hour: "5",
    isLunar: false,
  });
  check("400 INVALID_INPUT (hour)", wrongType.status === 400);
  const wtData = wrongType.data as { code?: string; field?: string };
  check("code === INVALID_INPUT", wtData.code === "INVALID_INPUT", wtData.code);
  check("field === hour", wtData.field === "hour", wtData.field);

  // ─── 결과 ───
  if (failures.length === 0) {
    console.log("✅ 통합 검증 통과");
    console.log("");
    console.log("케이스 1 응답 요약:");
    console.log(
      `  ${r.saju.year.label}년 ${r.saju.month.label}월 ${r.saju.day.label}일 ${r.saju.hour?.label ?? "(시주 미지)"}시`,
    );
    console.log(
      `  음력: ${r.saju.lunarDate.year}-${r.saju.lunarDate.month}-${r.saju.lunarDate.day}`,
    );
    console.log("  오행 balance:", r.ohaeng.balance);
    console.log("  부족:", r.ohaeng.deficient, " 과다:", r.ohaeng.excessive);
    console.log("  용신:", r.ohaeng.yongsin, " 기신:", r.ohaeng.gisin);
    console.log("  방향:", r.ohaeng.nameDirection);
  } else {
    console.error("❌ 통합 검증 실패");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("❌ 예외 발생:", e);
  process.exit(1);
});
