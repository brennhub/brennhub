/**
 * 사주 계산 검증 — 진태양시 격상 후.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/saju-poc.test.ts
 *
 * 검증 케이스:
 *   case 1 — 기준(외숙모, 1979-05-29 05:00 양력). 진태양시 보정으로 시주 변동:
 *     OLD(보정 무): "신묘" (시 단위 경계)
 *     NEW(보정 후): "경인" (보정 ~−29분 → 04:31 진태양시 → 寅時 03:30~05:29)
 *     ohaeng 분포는 동일 (寅·卯 모두 목, 경·신 모두 금).
 *   case 2 — 시간 미지 (hour=null) → 시주 미지, ohaeng 카운트 3주만.
 *   case 3 — 1957-08-15 14:00 (DST + 127.5° 자오선) → dstApplied=true, meridian=127.5.
 *   case 4 — 야자시 (입력 1985-12-26 00:05) → dayPillarShifted=true, 시지 子.
 *   case 5 — 조자시 (입력 1985-12-26 00:50) → dayPillarShifted=false, 시지 子.
 *   case 6 — 균시차 표본 검증 (1월 vs 5월 vs 9월).
 *   case 7 — longitude override (140°) → 양수 경도 보정.
 *   case 8 — 30분 경계 시지 (子 23:30 ~ 01:29 등 표 verbatim).
 */

import {
  calculateSaju,
  dayOfYear,
  equationOfTimeMinutes,
  isKoreaDstActive,
  getKoreaMeridian,
  getHourBranchIndexFromMinutes,
  type Pillar,
} from "../lib/saju";

const failures: string[] = [];
function check(label: string, cond: boolean, hint?: unknown): void {
  if (!cond) failures.push(`${label}${hint !== undefined ? ` (got ${JSON.stringify(hint)})` : ""}`);
}
function isPillar(h: Pillar | { unknown: true }): h is Pillar {
  return !("unknown" in h);
}

// ─── case 1 — 기준 1979-05-29 05:00 양력 ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  check("case1 year=기미", r.year.label === "기미", r.year.label);
  check("case1 month=경오", r.month.label === "경오", r.month.label);
  check("case1 day=병신", r.day.label === "병신", r.day.label);
  check("case1 hour Pillar", isPillar(r.hour));
  if (isPillar(r.hour)) {
    check("case1 hour=경인 (진태양시 보정)", r.hour.label === "경인", r.hour.label);
  }
  check("case1 trueSolar 존재", r.trueSolar !== undefined);
  check("case1 dstApplied=false", r.trueSolar?.dstApplied === false);
  check("case1 meridian=135", r.trueSolar?.meridian === 135);
  check("case1 dayPillarShifted=false", r.trueSolar?.dayPillarShifted === false);
  // ohaeng 분포 (寅·卯·신·경 모두 동일 오행이라 OLD와 동일)
  check("case1 목=1", r.ohaeng.목 === 1);
  check("case1 화=2", r.ohaeng.화 === 2);
  check("case1 토=2", r.ohaeng.토 === 2);
  check("case1 금=3", r.ohaeng.금 === 3);
  check("case1 수=0", r.ohaeng.수 === 0);
  // findDeficient는 count ≤ 1 (목 1, 수 0 모두 포함). analyzeOhaeng 라우트와 별도.
  check("case1 deficient=['목','수']", JSON.stringify(r.deficient) === JSON.stringify(["목", "수"]));
  check("case1 excessive=['금']", JSON.stringify(r.excessive) === JSON.stringify(["금"]));
}

// ─── case 2 — 시간 미지 ───
{
  const r = calculateSaju(1979, 5, 29, null, false);
  check("case2 hour unknown", "unknown" in r.hour);
  check("case2 trueSolar undefined", r.trueSolar === undefined);
  // ohaeng 3주 카운트: 기미·경오·병신 = 천간 기/경/병 + 지지 미/오/신
  //   천간: 기(토) 경(금) 병(화). 지지: 미(토) 오(화) 신(금). → 화 2, 토 2, 금 2.
  check("case2 목=0", r.ohaeng.목 === 0);
  check("case2 화=2", r.ohaeng.화 === 2);
  check("case2 토=2", r.ohaeng.토 === 2);
  check("case2 금=2", r.ohaeng.금 === 2);
  check("case2 수=0", r.ohaeng.수 === 0);
}

// ─── case 3 — 1957-08-15 14:00 (DST + 127.5° 자오선) ───
{
  check("case3 1957-08-15 DST active",
    isKoreaDstActive(1957, 8, 15) === true);
  check("case3 1957-08-15 meridian=127.5",
    getKoreaMeridian(1957, 8, 15) === 127.5);
  const r = calculateSaju(1957, 8, 15, 14, false);
  check("case3 dstApplied=true", r.trueSolar?.dstApplied === true);
  check("case3 meridian=127.5", r.trueSolar?.meridian === 127.5);
  // 보정: DST -60 + lon -2 + EoT(~-5) ≈ -67min → 14:00 → 12:53 진태양시 → 午時(11:30~13:29)
  if (isPillar(r.hour)) {
    check("case3 시지=오 (午, 진태양시 12:53)", r.hour.ji === "오", r.hour.ji);
  }
}

// ─── case 4 — 야자시 (입력 1985-12-26 00:05 KST) ───
{
  const r = calculateSaju(1985, 12, 26, 0, false, { minute: 5 });
  // 1985 → meridian 135 (1961+). lonMin=-32, EoT~0 → 00:05 - 32 = 23:33 (전날) → 야자시.
  check("case4 dayPillarShifted=true (야자시)", r.trueSolar?.dayPillarShifted === true);
  if (isPillar(r.hour)) {
    check("case4 시지=자 (子, 23:33 진태양시)", r.hour.ji === "자", r.hour.ji);
  }
  // 일주: 진태양시 12-25 + 야자 shift = 12-26 (입력일과 동일)
  // 일주는 보정 진태양시 양력 12-26일진. 1985-12-26 일진 검증 위해 별도 KLC 호출 비교.
}

// ─── case 5 — 조자시 (입력 1985-12-26 00:50 KST) ───
{
  const r = calculateSaju(1985, 12, 26, 0, false, { minute: 50 });
  // 보정: -32 → 00:18 진태양시 (당일). 조자시 = 일주 당일(12-26).
  check("case5 dayPillarShifted=false (조자시)", r.trueSolar?.dayPillarShifted === false);
  if (isPillar(r.hour)) {
    check("case5 시지=자 (子, 00:18 진태양시)", r.hour.ji === "자", r.hour.ji);
  }
}

// ─── case 6 — 균시차 표본 (Spencer 1971 정정 계수) ───
{
  // 균시차 연중 진폭 ±~16분. 표본:
  //   2월 중순 ≈ -14분 (가장 큼 음수)
  //   5월 중순 ≈ +3.5분
  //   7월 말 ≈ -6분
  //   11월 초 ≈ +16분 (가장 큼 양수)
  const eot_feb15 = equationOfTimeMinutes(46);   // Feb 15
  const eot_may15 = equationOfTimeMinutes(135);  // May 15
  const eot_jul30 = equationOfTimeMinutes(211);  // Jul 30
  const eot_nov03 = equationOfTimeMinutes(307);  // Nov 3
  check("case6 Feb mid ≈ -14 (±2)", Math.abs(eot_feb15 - (-14)) < 2, eot_feb15.toFixed(2));
  check("case6 May mid ≈ +3.5 (±2)", Math.abs(eot_may15 - 3.5) < 2, eot_may15.toFixed(2));
  check("case6 Jul end ≈ -6 (±2)", Math.abs(eot_jul30 - (-6)) < 2, eot_jul30.toFixed(2));
  check("case6 Nov 3 ≈ +16 (±2)", Math.abs(eot_nov03 - 16) < 2, eot_nov03.toFixed(2));
}

// ─── case 7 — longitude override 140° ───
{
  const r = calculateSaju(2000, 6, 15, 12, false, { longitude: 140 });
  // dst auto → 2000 not in periods → no DST. meridian auto → 135 (after 1961-08-10).
  // lonMin = (140 - 135) × 4 = +20. 양수 보정 → 시각 +20분 → 12:20 + EoT.
  check("case7 longitudeMinutes=+20", r.trueSolar?.longitudeMinutes === 20);
  check("case7 dstApplied=false", r.trueSolar?.dstApplied === false);
  check("case7 meridian=135", r.trueSolar?.meridian === 135);
}

// ─── case 8 — 30분 경계 시지 (보정 진태양시 단위) ───
{
  // 子: 23:30~01:29 / 丑: 01:30~03:29 / ... / 亥: 21:30~23:29
  check("case8 23:30 → 子(0)", getHourBranchIndexFromMinutes(23, 30) === 0);
  check("case8 01:29 → 子(0)", getHourBranchIndexFromMinutes(1, 29) === 0);
  check("case8 01:30 → 丑(1)", getHourBranchIndexFromMinutes(1, 30) === 1);
  check("case8 03:29 → 丑(1)", getHourBranchIndexFromMinutes(3, 29) === 1);
  check("case8 11:30 → 午(6)", getHourBranchIndexFromMinutes(11, 30) === 6);
  check("case8 13:29 → 午(6)", getHourBranchIndexFromMinutes(13, 29) === 6);
  check("case8 23:29 → 亥(11)", getHourBranchIndexFromMinutes(23, 29) === 11);
  check("case8 00:00 → 子(0)", getHourBranchIndexFromMinutes(0, 0) === 0);
  check("case8 12:00 → 午(6)", getHourBranchIndexFromMinutes(12, 0) === 6);
}

// ─── 부수 검증 ───
{
  // dayOfYear 정합
  check("dayOfYear 1979-01-01 = 1", dayOfYear(1979, 1, 1) === 1);
  check("dayOfYear 1979-05-29 = 149", dayOfYear(1979, 5, 29) === 149);
  check("dayOfYear 1979-12-31 = 365", dayOfYear(1979, 12, 31) === 365);
  check("dayOfYear 2000-12-31 = 366 (윤년)", dayOfYear(2000, 12, 31) === 366);

  // DST 경계 검증
  check("1948-06-01 DST", isKoreaDstActive(1948, 6, 1) === true);
  check("1948-09-12 DST", isKoreaDstActive(1948, 9, 12) === true);
  check("1948-09-13 DST 종료", isKoreaDstActive(1948, 9, 13) === false);
  check("1957-08-15 DST", isKoreaDstActive(1957, 8, 15) === true);
  check("1986-08-15 DST 없음", isKoreaDstActive(1986, 8, 15) === false);
  check("1988-10-08 DST", isKoreaDstActive(1988, 10, 8) === true);
  check("1988-10-09 DST 종료", isKoreaDstActive(1988, 10, 9) === false);

  // 표준자오선 경계
  check("1953-12-31 meridian=135", getKoreaMeridian(1953, 12, 31) === 135);
  check("1954-03-20 meridian=135", getKoreaMeridian(1954, 3, 20) === 135);
  check("1954-03-21 meridian=127.5", getKoreaMeridian(1954, 3, 21) === 127.5);
  check("1961-08-09 meridian=127.5", getKoreaMeridian(1961, 8, 9) === 127.5);
  check("1961-08-10 meridian=135", getKoreaMeridian(1961, 8, 10) === 135);
  check("2000-01-01 meridian=135", getKoreaMeridian(2000, 1, 1) === 135);
}

if (failures.length === 0) {
  console.log("✅ saju 진태양시 PoC 통과 (8 case + 부수).");
  console.log("");
  console.log("(verbatim 변동) 1979-05-29 05:00 양력 시주: OLD '신묘' → NEW '경인'.");
  console.log("  ↳ 보정 ~-29분 (lon -32, EoT +3, no DST) → 04:31 진태양시 → 寅時");
  console.log("    ohaeng 분포는 동일 (寅·卯 모두 목, 경·신 모두 금).");
} else {
  console.error(`❌ PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
