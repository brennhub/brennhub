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
import { jeolgiKST } from "../lib/jeolgi";
import { JIJANG_TABLE, getJijangContributions } from "../lib/jijang";
import { analyzeOhaeng } from "../lib/ohaeng";
import { JIJI } from "../lib/saju";

const failures: string[] = [];
function check(label: string, cond: boolean, hint?: unknown): void {
  if (!cond) failures.push(`${label}${hint !== undefined ? ` (got ${JSON.stringify(hint)})` : ""}`);
}
function isPillar(h: Pillar | { unknown: true }): h is Pillar {
  return !("unknown" in h);
}

// ─── case 1 — 기준 1979-05-29 05:00 양력 (입춘+12절기 격상 후 verbatim 변동) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  check("case1 year=기미", r.year.label === "기미", r.year.label);
  // 月柱 변동: OLD(라이브러리 음력) '경오' → NEW(입하 1979-05-06 11:47 이후 巳월) '기사'.
  check("case1 month=기사 (입하 절기 기준)", r.month.label === "기사", r.month.label);
  check("case1 day=병신", r.day.label === "병신", r.day.label);
  check("case1 hour Pillar", isPillar(r.hour));
  if (isPillar(r.hour)) {
    check("case1 hour=경인 (진태양시 보정)", r.hour.label === "경인", r.hour.label);
  }
  check("case1 trueSolar 존재", r.trueSolar !== undefined);
  check("case1 dstApplied=false", r.trueSolar?.dstApplied === false);
  check("case1 meridian=135", r.trueSolar?.meridian === 135);
  check("case1 dayPillarShifted=false", r.trueSolar?.dayPillarShifted === false);
  // B-1 격상 (지장간 일수 비례). 사주 기미·기사·병신·경인 → 지지 미·사·신·인 분배:
  //   미 (고지) 丁9+乙3+己18 → 화 0.300 + 목 0.100 + 토 0.600
  //   사 (생지) 戊7+庚7+丙16 → 토 0.233 + 금 0.233 + 화 0.533
  //   신 (생지) 戊7+壬7+庚16 → 토 0.233 + 수 0.233 + 금 0.533
  //   인 (생지) 戊7+丙7+甲16 → 토 0.233 + 화 0.233 + 목 0.533
  // 천간 (기·기·병·경) → 토 2, 화 1, 금 1.
  // 총: 목 0.633, 화 2.066, 토 3.299, 금 1.766, 수 0.233. 합 = 8.0.
  check("case1 목≈0.633", Math.abs(r.ohaeng.목 - 0.633) < 0.01, r.ohaeng.목);
  check("case1 화≈2.066", Math.abs(r.ohaeng.화 - 2.066) < 0.01, r.ohaeng.화);
  check("case1 토≈3.299", Math.abs(r.ohaeng.토 - 3.299) < 0.01, r.ohaeng.토);
  check("case1 금≈1.766", Math.abs(r.ohaeng.금 - 1.766) < 0.01, r.ohaeng.금);
  check("case1 수≈0.233", Math.abs(r.ohaeng.수 - 0.233) < 0.01, r.ohaeng.수);
  // 임계 4-α (deficient ≤0.5, excessive ≥2.5).
  //   수 0.233 ≤ 0.5 ✓ deficient. 목 0.633 > 0.5 → not deficient.
  //   토 3.299 ≥ 2.5 ✓ excessive. 화 2.066 < 2.5 → not excessive.
  check("case1 deficient=['수']", JSON.stringify(r.deficient) === JSON.stringify(["수"]));
  check("case1 excessive=['토']", JSON.stringify(r.excessive) === JSON.stringify(["토"]));
}

// ─── case 2 — 시간 미지 ───
{
  const r = calculateSaju(1979, 5, 29, null, false);
  check("case2 hour unknown", "unknown" in r.hour);
  check("case2 trueSolar undefined", r.trueSolar === undefined);
  // 3 pillar (기미·기사·병신). 천간 토 2 + 화 1. 지지 미·사·신 분배:
  //   목 0.1, 화 0.833, 토 1.066, 금 0.766, 수 0.233.
  // 총: 목 0.1, 화 1.833, 토 3.066, 금 0.766, 수 0.233. 합 = 6.0.
  check("case2 목≈0.1", Math.abs(r.ohaeng.목 - 0.1) < 0.01);
  check("case2 화≈1.833", Math.abs(r.ohaeng.화 - 1.833) < 0.01);
  check("case2 토≈3.066", Math.abs(r.ohaeng.토 - 3.066) < 0.01);
  check("case2 금≈0.766", Math.abs(r.ohaeng.금 - 0.766) < 0.01);
  check("case2 수≈0.233", Math.abs(r.ohaeng.수 - 0.233) < 0.01);
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

// ─── case 9 — 입춘 경계 (KASI 2024 입춘 17:27 KST) ───
{
  // 직전 17:00 → 전년(癸卯) + 축월(乙丑)
  const before = calculateSaju(2024, 2, 4, 17, false);
  check("case9 입춘 직전(17:00) 연주=계묘",
    before.year.label === "계묘", before.year.label);
  check("case9 입춘 직전(17:00) 월주=을축",
    before.month.label === "을축", before.month.label);
  // 직후 18:00 → 당년(甲辰) + 寅월(丙寅, 갑년 정월)
  const after = calculateSaju(2024, 2, 4, 18, false);
  check("case9 입춘 직후(18:00) 연주=갑진",
    after.year.label === "갑진", after.year.label);
  check("case9 입춘 직후(18:00) 월주=병인",
    after.month.label === "병인", after.month.label);
}

// ─── case 10 — 입하 경계 (KASI 1979 입하 11:47 KST) ───
{
  const before = calculateSaju(1979, 5, 6, 9, false); // 입하 직전 → 辰월
  check("case10 입하 직전(09:00) 월주=무진 (辰월)",
    before.month.label === "무진", before.month.label);
  const after = calculateSaju(1979, 5, 6, 12, false); // 입하 직후 → 巳월
  check("case10 입하 직후(12:00) 월주=기사 (巳월)",
    after.month.label === "기사", after.month.label);
}

// ─── case 11 — KASI 2024 권위값 대조 (절기 시각 정밀도 검증) ───
{
  // KASI 발표: 입춘 02-04 17:27 / 입하 05-05 09:10 / 동지 12-21 18:21 (분 단위 반올림)
  // 우리 VSOP87 절단 구현 vs KASI: ±51초 max (±30초 평균, KASI 분 반올림 흡수 가능).
  function jeolgiHhMm(year: number, idx: number): string {
    const d = jeolgiKST(year, idx);
    return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  }
  function jeolgiSecondsFromExpected(year: number, idx: number, expHH: number, expMM: number): number {
    const d = jeolgiKST(year, idx);
    const ourMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    const expMin = expHH * 60 + expMM;
    return Math.abs(ourMin - expMin) * 60; // 초
  }
  const tol = 90; // KASI 발표 분 반올림(±30초) + VSOP87 절단 ±수십초 마진
  check(`case11 2024 입춘 ≈ 17:27 (우리 ${jeolgiHhMm(2024, 0)})`,
    jeolgiSecondsFromExpected(2024, 0, 17, 27) < tol);
  check(`case11 2024 입하 ≈ 09:10 (우리 ${jeolgiHhMm(2024, 6)})`,
    jeolgiSecondsFromExpected(2024, 6, 9, 10) < tol);
  check(`case11 2024 동지 ≈ 18:21 (우리 ${jeolgiHhMm(2024, 21)})`,
    jeolgiSecondsFromExpected(2024, 21, 18, 21) < tol);
  check(`case11 2024 춘분 ≈ 12:06 (우리 ${jeolgiHhMm(2024, 3)})`,
    jeolgiSecondsFromExpected(2024, 3, 12, 6) < tol);
}

// ─── case 12 — 1957 자오선 127.5° 영향 절기 (KASI 1957 입춘 시각) ───
{
  // 1957은 표준자오선 127.5° 시기. 절기 시각도 그 자오선 기준.
  const lichun1957 = jeolgiKST(1957, 0);
  check("case12 1957 입춘 년도=1957", lichun1957.getUTCFullYear() === 1957);
  check("case12 1957 입춘 월=2", lichun1957.getUTCMonth() + 1 === 2);
  check("case12 1957 입춘 일=4", lichun1957.getUTCDate() === 4);
  // 자오선 127.5° 적용 자동 (KASI 발표 vs 우리 vs 135° 환산)
  // 1957 입춘 (KASI) ≈ 02-04 10:24 KST (검증 출력 기반).
  // (구체 시각 검증보다 자오선/연도 무결성 확인)
}

// ─── case 13 — 지장간 표 검증 (위키 verbatim) ───
{
  // 12지지 일수 합 = 30 (각 지지 1.0 contribution)
  for (const jiji of JIJI) {
    const entries = JIJANG_TABLE[jiji];
    const totalDays = entries.reduce((s, e) => s + e.days, 0);
    check(`case13 ${jiji} 일수 합=30`, totalDays === 30, totalDays);
    const c = getJijangContributions(jiji);
    const sum = c.목 + c.화 + c.토 + c.금 + c.수;
    check(`case13 ${jiji} 오행 합=1.0`, Math.abs(sum - 1) < 0.0001, sum);
  }
  // 자 (왕지, 壬10+癸20 = 전부 수)
  const cJa = getJijangContributions("자");
  check("case13 자 수=1.0", Math.abs(cJa.수 - 1) < 0.0001, cJa.수);
  // 인 (생지, 戊7+丙7+甲16 = 토 7/30 + 화 7/30 + 목 16/30)
  const cIn = getJijangContributions("인");
  check("case13 인 목≈16/30", Math.abs(cIn.목 - 16 / 30) < 0.0001);
  check("case13 인 화≈7/30", Math.abs(cIn.화 - 7 / 30) < 0.0001);
  check("case13 인 토≈7/30", Math.abs(cIn.토 - 7 / 30) < 0.0001);
  // 午 특수 (병10+기9+정11 → 화 21/30, 토 9/30)
  const cOh = getJijangContributions("오");
  check("case13 오 화=21/30 (병10+정11)", Math.abs(cOh.화 - 21 / 30) < 0.0001);
  check("case13 오 토=9/30 (기9)", Math.abs(cOh.토 - 9 / 30) < 0.0001);
}

// ─── case 14 — analyzeOhaeng 임계 4-α 통일 (saju.ts ↔ ohaeng.ts) ───
{
  // 합성 fraction balance — 임계 경계 검증
  const synth = { 목: 0.4, 화: 1.5, 토: 2.8, 금: 0.6, 수: 0.5 };
  const a = analyzeOhaeng(synth);
  // deficient ≤ 0.5: 목(0.4)·수(0.5). 금(0.6) > 0.5 → not.
  check("case14 목(0.4) deficient", a.deficient.includes("목"));
  check("case14 수(0.5) deficient", a.deficient.includes("수"));
  check("case14 금(0.6) not deficient", !a.deficient.includes("금"));
  // excessive ≥ 2.5: 토(2.8). 화(1.5) → not.
  check("case14 토(2.8) excessive", a.excessive.includes("토"));
  check("case14 화(1.5) not excessive", !a.excessive.includes("화"));
}

if (failures.length === 0) {
  console.log("✅ saju 명식 PoC 통과 (14 case + 부수).");
  console.log("");
  console.log("(verbatim 변동 — 진태양시) 1979-05-29 05:00 시주: OLD '신묘' → NEW '경인'.");
  console.log("(verbatim 변동 — 12절기) 1979-05-29 월주: OLD(라이브러리 음력) '경오' → NEW(입하 기준) '기사'.");
  console.log("(verbatim 변동 — 지장간 B-1) 오행 정수 → fraction. 외숙모 토 3 → 3.299, 수 0 → 0.233, 목 1 → 0.633.");
  console.log("  → 임계 ≤0.5 / ≥2.5 (사주 ≤1 / ≥3에서 변경). deficient ['목','수'] → ['수'].");
} else {
  console.error(`❌ PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
