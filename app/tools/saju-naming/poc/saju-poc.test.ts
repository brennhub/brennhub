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
import { detectRelations } from "../lib/relations";
import { getSipsin, getSipsinGroup } from "../lib/sipsin";
import { evaluateDeuglyeong, evaluateDeukji } from "../lib/gangyak";
import { evaluateYongsin, simpleCountYongsin } from "../lib/yongsin";

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

// ─── case 14 — 단순카운트 임계 4-α 통일 (B-3-c 부분 대체 후, 중화/참고 메타 검증) ───
{
  // B-3-c 격상: analyzeOhaeng는 강약 등 필요 → 단순카운트 로직만 단독 검증.
  // simpleCountYongsin은 yongsin.ts에서 export (중화 분기 + ohaeng-poc 공유).
  const synth = { 목: 0.4, 화: 1.5, 토: 2.8, 금: 0.6, 수: 0.5 };
  const a = simpleCountYongsin(synth);
  // deficient ≤ 0.5: 목(0.4)·수(0.5). 금(0.6) > 0.5 → not.
  check("case14 목(0.4) deficient", a.deficient.includes("목"));
  check("case14 수(0.5) deficient", a.deficient.includes("수"));
  check("case14 금(0.6) not deficient", !a.deficient.includes("금"));
  // excessive ≥ 2.5: 토(2.8). 화(1.5) → not.
  check("case14 토(2.8) excessive", a.excessive.includes("토"));
  check("case14 화(1.5) not excessive", !a.excessive.includes("화"));
}

// ─── case 15 — 외숙모 합충 감지 (B-2 P1) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  const rel = r.relations;
  check("case15 relations 존재", rel !== undefined);
  if (rel) {
    // 사·신 육합 (수): 月·日 지지
    const jiHapSashin = rel.jiHap.find(
      (e) => e.members.includes("사") && e.members.includes("신"),
    );
    check("case15 육합 사·신 (월·일) → 수", jiHapSashin?.resultOhaeng === "수");
    // 충 인·신: 일·시 지지
    const chungInsin = rel.chung.find(
      (e) => e.members.includes("인") && e.members.includes("신"),
    );
    check("case15 충 인·신 (일·시)", chungInsin !== undefined);
    // 삼형 인·사·신 (지세지형)
    const samhyung = rel.hyung.find(
      (e) =>
        e.kind === "삼형" &&
        e.members.includes("인") &&
        e.members.includes("사") &&
        e.members.includes("신"),
    );
    check("case15 삼형 인·사·신 (지세지형)", samhyung !== undefined);
    // 파 사·신 (육합과 동시)
    const paSashin = rel.pa.find(
      (e) => e.members.includes("사") && e.members.includes("신"),
    );
    check("case15 파 사·신 (월·일)", paSashin !== undefined);
    // 해 사·인 (월·시)
    const haeSain = rel.hae.find(
      (e) => e.members.includes("사") && e.members.includes("인"),
    );
    check("case15 해 사·인 (월·시)", haeSain !== undefined);
  }
}

// ─── case 16 — detectRelations 합성 (다양 표 검증) ───
{
  // 천간합 갑·기 (직접 호출)
  const r1 = detectRelations(
    [
      { gan: "갑", position: "year" },
      { gan: "기", position: "day" },
    ],
    [],
  );
  check("case16 천간합 갑·기 → 토", r1.ganHap[0]?.resultOhaeng === "토");

  // 충 자·오
  const r2 = detectRelations(
    [],
    [
      { ji: "자", position: "year" },
      { ji: "오", position: "day" },
    ],
  );
  check("case16 충 자·오", r2.chung.length === 1);

  // 삼합 신·자·진 → 수국
  const r3 = detectRelations(
    [],
    [
      { ji: "신", position: "year" },
      { ji: "자", position: "month" },
      { ji: "진", position: "day" },
    ],
  );
  check("case16 삼합 신·자·진 → 수", r3.samhap[0]?.resultOhaeng === "수");

  // 방합 인·묘·진 → 목 (동방)
  const r4 = detectRelations(
    [],
    [
      { ji: "인", position: "year" },
      { ji: "묘", position: "month" },
      { ji: "진", position: "day" },
    ],
  );
  check("case16 방합 인·묘·진 → 목", r4.banghap[0]?.resultOhaeng === "목");

  // 자형 진·진 (동일 글자 2개)
  const r5 = detectRelations(
    [],
    [
      { ji: "진", position: "year" },
      { ji: "진", position: "day" },
    ],
  );
  check("case16 자형 진·진", r5.hyung.some((e) => e.kind === "자형"));

  // 자묘 상형 (무례지형)
  const r6 = detectRelations(
    [],
    [
      { ji: "자", position: "year" },
      { ji: "묘", position: "day" },
    ],
  );
  check("case16 상형 자·묘", r6.hyung.some((e) => e.kind === "상형"));

  // 자미: 해 + 원진 동시 감지
  const r7 = detectRelations(
    [],
    [
      { ji: "자", position: "year" },
      { ji: "미", position: "day" },
    ],
  );
  check("case16 자·미 해 감지", r7.hae.length === 1);
  check("case16 자·미 원진 동시 감지", r7.wonjin.length === 1);
}

// ─── case 17 — 외숙모 십신 verbatim (B-3-a) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  const sp = r.sipsin;
  check("case17 sipsin 존재", sp !== undefined);
  if (sp) {
    check("case17 일간=병", sp.dayStem === "병");
    // 년 천간 기(토·음): 병(화·양) → 토(생함) + 음양 다름 → 상관
    check("case17 년 천간 상관", sp.year.stemSipsin === "상관");
    // 월 천간 기 → 상관 (동일)
    check("case17 월 천간 상관", sp.month.stemSipsin === "상관");
    // 일 천간 병(자신) → 비견
    check("case17 일 천간 비견", sp.day.stemSipsin === "비견");
    // 시 천간 경(금·양): 병이 극함(화→금) + 양양 동 → 편재
    check("case17 시 천간 편재", sp.hour?.stemSipsin === "편재");
    // groupCounts 합 8.0 (4 천간 4 + 4 지지 일수비례 4)
    const sum = Object.values(sp.groupCounts).reduce((a, b) => a + b, 0);
    check("case17 groupCounts 합=8.0", Math.abs(sum - 8) < 0.01, sum);
    // 식상 압도 (≈ 3.3)
    check("case17 식상 압도(≈3.3)", Math.abs(sp.groupCounts.식상 - 3.3) < 0.01);
    // 관성 매우 약 (≈ 0.233 — 일주 신 지장간 壬 7日만)
    check("case17 관성 매우 약(≈0.233)", Math.abs(sp.groupCounts.관성 - 0.233) < 0.01);
  }
}

// ─── case 18 — getSipsin 합성 검증 (10 종 + 그룹) ───
{
  // 일간 갑(목·양) 기준 모든 십신 매핑
  check("case18 갑→갑 = 비견 (오행같음·음양동)", getSipsin("갑", "갑") === "비견");
  check("case18 갑→을 = 겁재 (오행같음·음양이)", getSipsin("갑", "을") === "겁재");
  check("case18 갑→병 = 식신 (생·동)", getSipsin("갑", "병") === "식신");
  check("case18 갑→정 = 상관 (생·이)", getSipsin("갑", "정") === "상관");
  check("case18 갑→무 = 편재 (극·동)", getSipsin("갑", "무") === "편재");
  check("case18 갑→기 = 정재 (극·이)", getSipsin("갑", "기") === "정재");
  check("case18 갑→경 = 편관 (극당함·동)", getSipsin("갑", "경") === "편관");
  check("case18 갑→신 = 정관 (극당함·이)", getSipsin("갑", "신") === "정관");
  check("case18 갑→임 = 편인 (생받음·동)", getSipsin("갑", "임") === "편인");
  check("case18 갑→계 = 정인 (생받음·이)", getSipsin("갑", "계") === "정인");
  // 그룹
  check("case18 비견 → 비겁 그룹", getSipsinGroup("비견") === "비겁");
  check("case18 식신 → 식상 그룹", getSipsinGroup("식신") === "식상");
  check("case18 편재 → 재성 그룹", getSipsinGroup("편재") === "재성");
  check("case18 정관 → 관성 그룹", getSipsinGroup("정관") === "관성");
  check("case18 정인 → 인성 그룹", getSipsinGroup("정인") === "인성");
}

// ─── case 19 — 추천 영향 0 확인 (외숙모 ohaeng/용신/방향 보존, 단순 카운트 그대로) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  // 단순 카운트 ohaeng (B-1)은 그대로
  check("case19 ohaeng 보존 — 토 ≈3.3", Math.abs(r.ohaeng.토 - 3.3) < 0.01);
  check("case19 deficient 보존 — [수]", JSON.stringify(r.deficient) === JSON.stringify(["수"]));
  check("case19 excessive 보존 — [토]", JSON.stringify(r.excessive) === JSON.stringify(["토"]));
  // sipsin은 추가 (영향 0)
  check("case19 sipsin 추가 (영향 0)", r.sipsin !== undefined);
}

// ─── case 20 — 외숙모 강약 verbatim (B-3-b) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  const g = r.gangyak;
  check("case20 gangyak 존재", g !== undefined);
  if (g) {
    // 월지 사(火) 본기 병(火) == 일간 병(火) → 비견 → 득령 O
    check("case20 득령 O (월지 사 본기 병=화 == 일간 병)", g.deuglyeong === true);
    check("case20 월지 본기 천간=병", g.raw.monthMainStem === "병");
    check("case20 월지 본기 오행=화", g.raw.monthMainOhaeng === "화");
    // 일지 신(金) 지장간 戊·壬·庚 — 일간 병(火)의 비겁(火)/인성(木) 없음 → 득지 X
    check("case20 득지 X (일지 신 지장간에 화/목 없음)", g.deukji === false);
    // 월·일지 외 자리에서 식상(설기) 우세 → 득세 X
    check("case20 득세 X (support < drain)", g.deukse === false);
    // 라벨 = 강변약 (O·X·X)
    check("case20 라벨=강변약", g.label === "강변약");
    check("case20 3단=중화", g.category === "중화");
    // raw 수치 (sim 결과 verbatim)
    check("case20 support≈1.167", Math.abs(g.raw.supportCount - 1.167) < 0.01, g.raw.supportCount);
    check("case20 drain≈3.833", Math.abs(g.raw.drainCount - 3.833) < 0.01, g.raw.drainCount);
  }
}

// ─── case 21 — 3원소 합성 검증 + 8분류 매핑 ───
{
  // 득령 합성 — 일간 갑(목) 기준
  // 갑이 월지 인(목·본기 갑)에 있으면 비견 → 득령 O
  const dRyeong1 = evaluateDeuglyeong("갑", { gan: "병", ji: "인", label: "병인" });
  check("case21 득령 — 갑·인(본기 갑=목,비견) → O", dRyeong1.deuglyeong === true);
  // 갑이 월지 자(수·본기 계)에 있으면 인성 → 득령 O
  const dRyeong2 = evaluateDeuglyeong("갑", { gan: "병", ji: "자", label: "병자" });
  check("case21 득령 — 갑·자(본기 계=수,인성) → O", dRyeong2.deuglyeong === true);
  // 갑이 월지 사(화·본기 병)에 있으면 식상 → 득령 X
  const dRyeong3 = evaluateDeuglyeong("갑", { gan: "병", ji: "사", label: "병사" });
  check("case21 득령 — 갑·사(본기 병=화,식상) → X", dRyeong3.deuglyeong === false);
  // 갑이 월지 신(금·본기 경)에 있으면 관성 → 득령 X
  const dRyeong4 = evaluateDeuglyeong("갑", { gan: "병", ji: "신", label: "병신" });
  check("case21 득령 — 갑·신(본기 경=금,관성) → X", dRyeong4.deuglyeong === false);

  // 득지 합성 — 일간 갑(목)
  // 일지 인(지장간 무·병·갑) → 갑 존재 → 득지 O
  const dJi1 = evaluateDeukji("갑", { gan: "병", ji: "인", label: "병인" });
  check("case21 득지 — 갑·인(지장간 갑 존재,비견) → O", dJi1.deukji === true);
  // 일지 신(지장간 무·임·경) → 목·수(인성) 미존재? 수는 임 → 인성 O → 득지 O
  const dJi2 = evaluateDeukji("갑", { gan: "병", ji: "신", label: "병신" });
  check("case21 득지 — 갑·신(지장간 임=수,인성) → O", dJi2.deukji === true);
  // 일지 미(지장간 정·을·기) → 을(목·비겁) 존재 → 득지 O
  const dJi3 = evaluateDeukji("갑", { gan: "병", ji: "미", label: "병미" });
  check("case21 득지 — 갑·미(지장간 을=목,비겁) → O", dJi3.deukji === true);
  // 일지 오(지장간 병·기·정) → 화·토·화 모두 비겁/인성 아님 → 득지 X
  const dJi4 = evaluateDeukji("갑", { gan: "병", ji: "오", label: "병오" });
  check("case21 득지 — 갑·오(지장간 화·토만) → X", dJi4.deukji === false);
}

// ─── case 22 — 추천 영향 0 (외숙모 ohaeng/용신/방향 보존, gangyak는 추가만) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  check("case22 ohaeng 보존 — 토 ≈3.3", Math.abs(r.ohaeng.토 - 3.3) < 0.01);
  check("case22 deficient 보존 — [수]", JSON.stringify(r.deficient) === JSON.stringify(["수"]));
  check("case22 excessive 보존 — [토]", JSON.stringify(r.excessive) === JSON.stringify(["토"]));
  check("case22 sipsin 보존 (B-3-a)", r.sipsin !== undefined);
  check("case22 gangyak 추가 (영향 0)", r.gangyak !== undefined);
}

// ─── case 23 — 외숙모 중화 → 단순카운트 보존 + johuMeta conflict=null (B-3-c) ───
{
  const r = calculateSaju(1979, 5, 29, 5, false);
  const y = evaluateYongsin(r.ohaeng, r.day.gan, r.gangyak, r.month.ji, r.sipsin);
  check("case23 method=simple-count (중화 분기)", y.yongsinMeta.method === "simple-count");
  check("case23 baseGroup=null", y.yongsinMeta.baseGroup === null);
  check("case23 yongsin=[금,수] 보존", JSON.stringify(y.yongsin) === JSON.stringify(["금", "수"]));
  check("case23 gisin=[화,토] 보존", JSON.stringify(y.gisin) === JSON.stringify(["화", "토"]));
  check("case23 nameDirection 보존", y.nameDirection === "금·수 오행 한자 위주로 추천");
  check("case23 johuMeta 존재 (사월=난)", y.johuMeta !== null);
  if (y.johuMeta) {
    check("case23 johuMeta.ohaeng=수", y.johuMeta.ohaeng === "수");
    check("case23 johuMeta.tendency=난", y.johuMeta.tendency === "난");
    // ⚠️ 수가 yongsin 포함 → conflict=null/applied=true (Plan 결정 7건 우선순위)
    check("case23 johuMeta.conflict=null (yongsin 포함)", y.johuMeta.conflict === null);
    check("case23 johuMeta.applied=true", y.johuMeta.applied === true);
  }
}

// ─── case 24 — C2 갑 신약 → 억부 변동 (보조 그룹, 사주 있는 것만) ───
{
  const r = calculateSaju(1979, 6, 16, 12, false);
  const y = evaluateYongsin(r.ohaeng, r.day.gan, r.gangyak, r.month.ji, r.sipsin);
  check("case24 일간=갑·라벨=약·카테고리=신약", r.day.gan === "갑" && r.gangyak.label === "약" && r.gangyak.category === "신약");
  check("case24 method=eokbu", y.yongsinMeta.method === "eokbu");
  check("case24 baseGroup=보조", y.yongsinMeta.baseGroup === "보조");
  // 보조 그룹 = 인성(수)·비겁(목). C2 비겁=1.633, 인성=0 → yongsin=[목]만
  check("case24 yongsin=[목] (인성 count=0 제외)", JSON.stringify(y.yongsin) === JSON.stringify(["목"]));
  // 반대 그룹 전체 = 식상(화)·재성(토)·관성(금)
  check("case24 gisin=[화,토,금]", JSON.stringify(y.gisin) === JSON.stringify(["화", "토", "금"]));
  check("case24 nameDirection 포함 '약 사주'", y.nameDirection.startsWith("약 사주"));
  // 오월 → 조후 수, yongsin/gisin 모두 미포함 → neutral
  if (y.johuMeta) {
    check("case24 johuMeta.conflict=neutral", y.johuMeta.conflict === "neutral");
    check("case24 johuMeta.applied=true", y.johuMeta.applied === true);
  }
}

// ─── case 25 — C6 갑 최강/신강 → 억부 변동 (억제 그룹, count 정렬) ───
{
  const r = calculateSaju(2008, 12, 30, 8, false);
  const y = evaluateYongsin(r.ohaeng, r.day.gan, r.gangyak, r.month.ji, r.sipsin);
  check("case25 일간=갑·라벨=최강·카테고리=신강", r.day.gan === "갑" && r.gangyak.label === "최강" && r.gangyak.category === "신강");
  check("case25 method=eokbu", y.yongsinMeta.method === "eokbu");
  check("case25 baseGroup=억제", y.yongsinMeta.baseGroup === "억제");
  // 억제 그룹 = 식상(화)·재성(토)·관성(금). 관성 count=0 제외, 정렬: 재성 1.6 > 식상 1.0
  check("case25 yongsin=[토,화] (관성 count=0 제외, 재성>식상 정렬)", JSON.stringify(y.yongsin) === JSON.stringify(["토", "화"]));
  // 반대 = 인성(수)·비겁(목)
  check("case25 gisin=[수,목]", JSON.stringify(y.gisin) === JSON.stringify(["수", "목"]));
  // 자월 → 조후 화 (한). 화 ∈ yongsin → conflict=null/applied=true
  if (y.johuMeta) {
    check("case25 johuMeta.ohaeng=화", y.johuMeta.ohaeng === "화");
    check("case25 johuMeta.tendency=한", y.johuMeta.tendency === "한");
    check("case25 johuMeta.conflict=null (yongsin 포함)", y.johuMeta.conflict === null);
  }
}

// ─── case 26 — C7 경 강/신강 + 환절기 진 → johuMeta=null ───
{
  const r = calculateSaju(2008, 4, 20, 12, false);
  const y = evaluateYongsin(r.ohaeng, r.day.gan, r.gangyak, r.month.ji, r.sipsin);
  check("case26 일간=경·라벨=강·카테고리=신강", r.day.gan === "경" && r.gangyak.label === "강" && r.gangyak.category === "신강");
  check("case26 method=eokbu", y.yongsinMeta.method === "eokbu");
  // 억제 그룹 = 식상(수)·재성(목)·관성(화). 정렬: 관성 1.766 > 식상 1.1 > 재성 0.833
  check("case26 yongsin=[화,수,목] (count desc)", JSON.stringify(y.yongsin) === JSON.stringify(["화", "수", "목"]));
  // 진월 환절기 → johuMeta=null
  check("case26 johuMeta=null (환절기 진)", y.johuMeta === null);
}

// ─── case 27 — 추천 영향 분기 (중화 보존 + 신강/신약 변동) ───
{
  // C1 외숙모 (중화) 보존 확인
  const r1 = calculateSaju(1979, 5, 29, 5, false);
  const y1 = evaluateYongsin(r1.ohaeng, r1.day.gan, r1.gangyak, r1.month.ji, r1.sipsin);
  check("case27 C1 외숙모 simple-count", y1.yongsinMeta.method === "simple-count");

  // C3 무 약변강 (중화) 보존 확인
  const r3 = calculateSaju(1992, 8, 20, 14, false);
  const y3 = evaluateYongsin(r3.ohaeng, r3.day.gan, r3.gangyak, r3.month.ji, r3.sipsin);
  check("case27 C3 무 simple-count", y3.yongsinMeta.method === "simple-count");
  check("case27 C3 yongsin=[목,수] 보존", JSON.stringify(y3.yongsin) === JSON.stringify(["목", "수"]));

  // C5 임 신약 변동 확인 (사주 있는 그룹 정렬)
  const r5 = calculateSaju(1979, 7, 4, 8, false);
  const y5 = evaluateYongsin(r5.ohaeng, r5.day.gan, r5.gangyak, r5.month.ji, r5.sipsin);
  check("case27 C5 임 eokbu", y5.yongsinMeta.method === "eokbu");
  // 비겁(수) 2.233 > 인성(금) 1.533 → [수,금]
  check("case27 C5 yongsin=[수,금] (count desc)", JSON.stringify(y5.yongsin) === JSON.stringify(["수", "금"]));
}

if (failures.length === 0) {
  console.log("✅ saju 명식 PoC 통과 (27 case + 부수).");
  console.log("");
  console.log("(verbatim 변동 — 진태양시) 1979-05-29 05:00 시주: OLD '신묘' → NEW '경인'.");
  console.log("(verbatim 변동 — 12절기) 1979-05-29 월주: OLD(라이브러리 음력) '경오' → NEW(입하 기준) '기사'.");
  console.log("(verbatim 변동 — 지장간 B-1) 오행 정수 → fraction. 외숙모 토 3 → 3.299, 수 0 → 0.233.");
  console.log("(verbatim 신규 — 합충 B-2) 외숙모 relations: 육합 사·신(수) / 충 인·신 / 삼형 인·사·신 / 파 사·신 / 해 사·인.");
  console.log("(verbatim 신규 — 십신 B-3-a) 외숙모 일간 병(화·양). 5 그룹: 식상 3.300 (압도) · 비겁 2.067 · 재성 1.767 · 인성 0.633 · 관성 0.233 (매우 약).");
  console.log("(verbatim 신규 — 강약 B-3-b) 외숙모 득령 O · 득지 X · 득세 X (support 1.167 vs drain 3.833) → 강변약 (중화). 월령 강한 출발이나 일지·세력 모두 약함.");
  console.log("(verbatim 신규 — 억부 B-3-c) 외숙모 = 강변약(중화) → simple-count 분기 유지, yongsin=[금,수] 보존. johuMeta=수(난,사월), 수가 yongsin 포함 → conflict=null/applied=true.");
  console.log("  C2 갑 약/신약 → eokbu, yongsin=[목] (인성=0 제외) / C5 임 약/신약 → eokbu, yongsin=[수,금] (count desc) / C6 갑 최강/신강 → eokbu, yongsin=[토,화] (관성=0 제외, 재성>식상 정렬) / C7 경 강/신강 → eokbu, yongsin=[화,수,목].");
  console.log("  ⚠️ 중화는 단순카운트 유지(검증 모델). 신강/신약만 억부 적용 — 강약 모델 한계(월령 동등 가중) 노출 회피.");
} else {
  console.error(`❌ PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
