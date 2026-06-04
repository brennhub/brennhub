/**
 * 사주 (四柱) 계산 — 한글 표기 + 진태양시 보정.
 *
 * 의존성: korean-lunar-calendar (한국천문연구원 기준 양↔음력 + 60갑자, day-level).
 * 한자 표기는 패키지의 getChineseGapja(), 한글은 getKoreanGapja() 사용. 본 모듈은 한글.
 *
 * 진태양시 보정 (default = 사용자 입력 = 한국 표준시 가정):
 *   ① DST 차감 — 한국 일광절약시간 시행 기간 자동 (1948~1960·1987~1988).
 *   ② 경도 보정 — 시기별 한국 표준자오선(135° 또는 127°30')에서 출생지 경도 (longitude − meridian)×4분.
 *   ③ 균시차 보정 — Spencer 1971 푸리에 급수 (정정 계수).
 *
 * 시주 결정 (진태양시 기준):
 *   - 30분 경계 12시진 (子 23:30~01:29 / 丑 01:30~03:29 / … / 亥 21:30~23:29).
 *   - 야자시(보정후 23:30~23:59) — 일주는 진태양시 다음 양력 날짜 (한국 통용 학파, default).
 *   - 조자시(00:00~01:29) — 일주는 당일 (시진 子).
 *   - 자정 학파(子初, 야자시 없음)는 BACKLOG 옵션.
 *
 * 시간 미지: hour = null 명시 → 시주 미지(`{ unknown: true }`), ohaeng 카운트 시 시주 제외.
 *
 * 범위 외 (절기 데이터 정찰 마무리 후 별도 task):
 *   - 연주/월주 절입 시각 정밀화 (현재 라이브러리 day-level 60갑자 그대로).
 */

// vendor된 ESM bundle을 named import로 가져옴. default export 형태는 OpenNext + Workers
// Edge runtime의 esbuild interop에서 module evaluation 실패. vendor 변형 후 named import.
// 경위: vendor/README.md + CHANGELOG 0.5.1 / 0.5.2 / 0.5.3.
import { KoreanLunarCalendar } from "./vendor/korean-lunar-calendar.js";

// ───────────────────────── 상수 ─────────────────────────

export const CHEONGAN = [
  "갑",
  "을",
  "병",
  "정",
  "무",
  "기",
  "경",
  "신",
  "임",
  "계",
] as const;
export type Cheongan = (typeof CHEONGAN)[number];

export const JIJI = [
  "자",
  "축",
  "인",
  "묘",
  "진",
  "사",
  "오",
  "미",
  "신",
  "유",
  "술",
  "해",
] as const;
export type Jiji = (typeof JIJI)[number];

export type Ohaeng = "목" | "화" | "토" | "금" | "수";

export const CHEONGAN_OHAENG: Record<Cheongan, Ohaeng> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

export const JIJI_OHAENG: Record<Jiji, Ohaeng> = {
  인: "목",
  묘: "목",
  사: "화",
  오: "화",
  진: "토",
  술: "토",
  축: "토",
  미: "토",
  신: "금",
  유: "금",
  해: "수",
  자: "수",
};

// 일간 → 시주 천간의 子時 시작 index.
// 갑/기 → 0 (갑자), 을/경 → 2 (병자), 병/신 → 4 (무자), 정/임 → 6 (경자), 무/계 → 8 (임자).
export const DAY_STEM_HOUR_BASE: Record<Cheongan, number> = {
  갑: 0,
  기: 0,
  을: 2,
  경: 2,
  병: 4,
  신: 4,
  정: 6,
  임: 6,
  무: 8,
  계: 8,
};

// ───────────────── 진태양시 보정 상수/데이터 ─────────────────

/**
 * 서울 경도 (동경 도). 광화문 ~127°00'.
 * 출처: 국토지리정보원 / KASI 공식 좌표.
 */
export const SEOUL_LONGITUDE = 127.0;

/** 한국 표준자오선 후보 (동경 도). */
const JAPAN_MERIDIAN = 135;
const PRE_REFORM_MERIDIAN = 127.5;

/**
 * 한국 일광절약시간(서머타임) 시행 기간 — 위키 일광 절약 시간제 표 verbatim (CC BY-SA).
 * 경계: 시작일 00:00 (포함) ~ 종료일 00:00 (제외). YYYY-MM-DD 문자열 비교.
 * 출처: https://ko.wikipedia.org/wiki/%EC%9D%BC%EA%B4%91_%EC%A0%88%EC%95%BD_%EC%8B%9C%EA%B0%84%EC%A0%9C
 */
export const KOREA_DST_PERIODS: ReadonlyArray<readonly [string, string]> = [
  ["1948-06-01", "1948-09-13"],
  ["1949-04-03", "1949-09-11"],
  ["1950-04-01", "1950-09-10"],
  ["1951-05-06", "1951-09-09"],
  ["1955-05-05", "1955-09-09"],
  ["1956-05-20", "1956-09-30"],
  ["1957-05-05", "1957-09-22"],
  ["1958-05-04", "1958-09-21"],
  ["1959-05-03", "1959-09-20"],
  ["1960-05-01", "1960-09-18"],
  ["1987-05-10", "1987-10-11"],
  ["1988-05-08", "1988-10-09"],
];

// ───────────────── 진태양시 보정 헬퍼 ─────────────────

/** 양력 (Y,M,D)의 day-of-year (1~366). UTC 기준 산술. */
export function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const target = Date.UTC(year, month - 1, day);
  return Math.floor((target - start) / 86400000) + 1;
}

/**
 * 균시차 (Equation of Time, 진태양시 − 평균태양시) — 분 단위.
 *
 * 출처: Spencer, J.W. (1971) "Fourier Series Representation of the Position of the Sun",
 *       Search 2(5): 172.
 *
 * 원전 인쇄 오류 정정 적용 (Wolfram MathWorld "Spencer's Formula" + pvlib 검증):
 *   - 상수 0.0000075 — 원전 인쇄 0.000075는 오기 (Dr. Spencer 직접 정정).
 *   - sin(2T) 계수 0.040849 — Duffie & Beckman / Vignola 책의 0.04089는 인쇄 오기.
 *
 * 최대 오차 ≈ 35초 (0.0025 라디안). 라디안 결과에 229.18 곱해 분 단위로 변환.
 * 천문/수학 공식이라 저작권 비대상.
 */
export function equationOfTimeMinutes(dayOfYearValue: number): number {
  const T = (2 * Math.PI * (dayOfYearValue - 1)) / 365;
  const eotRadians =
    0.0000075 +
    0.001868 * Math.cos(T) -
    0.032077 * Math.sin(T) -
    0.014615 * Math.cos(2 * T) -
    0.040849 * Math.sin(2 * T);
  return eotRadians * 229.18; // 라디안 → 분
}

/**
 * (year, month, day)가 한국 일광절약시간 시행 기간인지 판정.
 * KOREA_DST_PERIODS 표를 기준 (시작일 00:00 포함, 종료일 00:00 미포함).
 */
export function isKoreaDstActive(year: number, month: number, day: number): boolean {
  const dateStr = formatDateStr(year, month, day);
  for (const [start, end] of KOREA_DST_PERIODS) {
    if (dateStr >= start && dateStr < end) return true;
  }
  return false;
}

/**
 * (year, month, day) 한국 채택 표준자오선 (동경 도).
 *   1954-03-21 ~ 1961-08-09: 127.5° (이승만 환원, GMT+8:30).
 *   그 외 (1912-01-01 이후 일제 도입 / 1961-08-10 이후 박정희 재환원): 135° (GMT+9).
 *
 * 출처: 표준시에관한법률 개정 이력 + ko.wikipedia 한국 표준시 / 일광 절약 시간제
 *       ("1955년부터 1960년까지 표준시의 기준 자오선이 동경 127˚ 30'").
 */
export function getKoreaMeridian(year: number, month: number, day: number): number {
  const dateStr = formatDateStr(year, month, day);
  if (dateStr >= "1954-03-21" && dateStr < "1961-08-10") return PRE_REFORM_MERIDIAN;
  return JAPAN_MERIDIAN;
}

/**
 * 30분 경계 시지 index (0=子, ..., 11=亥) — 보정 진태양시 (h, m)에서.
 *   子 23:30~01:29 / 丑 01:30~03:29 / 寅 03:30~05:29 / 卯 05:30~07:29 /
 *   辰 07:30~09:29 / 巳 09:30~11:29 / 午 11:30~13:29 / 未 13:30~15:29 /
 *   申 15:30~17:29 / 酉 17:30~19:29 / 戌 19:30~21:29 / 亥 21:30~23:29.
 * 출처: 명리학 표준 (사실).
 */
export function getHourBranchIndexFromMinutes(hour: number, minute: number): number {
  const totalMin = hour * 60 + minute;
  return Math.floor(((totalMin + 30) % 1440) / 120);
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ───────────────────────── 타입 ─────────────────────────

export interface Pillar {
  gan: Cheongan;
  ji: Jiji;
  ganOhaeng: Ohaeng;
  jiOhaeng: Ohaeng;
  label: string; // 예: "기미"
}

/** 시주 — 결정된 시진(Pillar) 또는 시간 미지. */
export type HourPillar = Pillar | { unknown: true };

export interface OhaengBalance {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

/** 진태양시 보정 메타. 시간 미지 시 SajuResult.trueSolar undefined. */
export interface TrueSolarMeta {
  /** 보정 진태양시 라벨 "YYYY-MM-DD HH:MM". */
  trueSolarLabel: string;
  /** DST 차감 적용 여부. */
  dstApplied: boolean;
  /** 경도 보정량(분) = (longitude − meridian) × 4. 음수면 입력 시각을 늦춤. */
  longitudeMinutes: number;
  /** 균시차 보정량(분). */
  eotMinutes: number;
  /** 야자시(보정후 23:30~23:59)로 일주를 진태양시 다음 양력 날짜로 이동했는지. */
  dayPillarShifted: boolean;
  /** 적용된 표준자오선 (동경 도). */
  meridian: number;
}

export interface SajuResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: HourPillar;
  ohaeng: OhaengBalance;
  deficient: Ohaeng[]; // count ≤ 1
  excessive: Ohaeng[]; // count ≥ 3
  lunarDate: {
    year: number;
    month: number;
    day: number;
    intercalation: boolean;
  };
  /** 진태양시 보정 메타. hour: { unknown: true } 시 undefined. */
  trueSolar?: TrueSolarMeta;
}

/** calculateSaju 보조 옵션 — 모두 optional. 미지정 시 한국 표준 default. */
export interface SajuOptions {
  /** 분 (0-59). default 0. */
  minute?: number;
  /** 출생지 경도(동경 도). default SEOUL_LONGITUDE (127.0). */
  longitude?: number;
  /**
   * DST 적용 여부 / "auto" (한국 시행 기간 자동 판정, 시기별 표준자오선 자동).
   * "auto" default. 명시(true/false) 시 표준자오선은 135° 가정
   * (한국 표준시 기준 외 국가의 시간대 보정은 추가 옵션 BACKLOG).
   */
  dst?: boolean | "auto";
}

// ───────────────────────── 헬퍼 (Pillar/Ohaeng) ─────────────────────────

/**
 * 갑자/병오 같은 2글자 한글 60갑자 문자열에서 Pillar 생성.
 * (라이브러리가 "기미년"·"임오일" 같은 3글자도 줄 수 있으나 첫 2글자만 사용.)
 */
export function makePillar(gapjaStr: string): Pillar {
  const gan = gapjaStr.charAt(0) as Cheongan;
  const ji = gapjaStr.charAt(1) as Jiji;
  return {
    gan,
    ji,
    ganOhaeng: CHEONGAN_OHAENG[gan],
    jiOhaeng: JIJI_OHAENG[ji],
    label: `${gan}${ji}`,
  };
}

function makeHourPillarFromBranch(dayStem: Cheongan, branchIdx: number): Pillar {
  const ji = JIJI[branchIdx];
  const stemIdx = (DAY_STEM_HOUR_BASE[dayStem] + branchIdx) % 10;
  const gan = CHEONGAN[stemIdx];
  return {
    gan,
    ji,
    ganOhaeng: CHEONGAN_OHAENG[gan],
    jiOhaeng: JIJI_OHAENG[ji],
    label: `${gan}${ji}`,
  };
}

function countOhaeng(pillars: Pillar[]): OhaengBalance {
  const o: OhaengBalance = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    o[p.ganOhaeng] += 1;
    o[p.jiOhaeng] += 1;
  }
  return o;
}

function findDeficient(o: OhaengBalance): Ohaeng[] {
  return (Object.keys(o) as Ohaeng[]).filter((k) => o[k] <= 1);
}

function findExcessive(o: OhaengBalance): Ohaeng[] {
  return (Object.keys(o) as Ohaeng[]).filter((k) => o[k] >= 3);
}

// ───────────────── 진태양시 보정 파이프라인 ─────────────────

interface TrueSolarResult {
  Y: number;
  M: number;
  D: number;
  h: number;
  m: number;
  meta: TrueSolarMeta;
}

/**
 * 사용자 입력(한국 표준시 가정) → 진태양시.
 * 파이프라인: DST 차감 → 경도 보정 → 균시차 보정 → 분 단위 누적 → 날짜 rollover 포함 정규화.
 * dst === "auto" 시 시기별 한국 표준자오선/DST 자동.
 */
function applyTrueSolarCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  longitude: number,
  dst: boolean | "auto",
): TrueSolarResult {
  const dstActive =
    dst === "auto" ? isKoreaDstActive(year, month, day) : dst;
  const meridian =
    dst === "auto" ? getKoreaMeridian(year, month, day) : JAPAN_MERIDIAN;

  const lonMin = (longitude - meridian) * 4;
  const eotMin = equationOfTimeMinutes(dayOfYear(year, month, day));
  let totalMin = lonMin + eotMin;
  if (dstActive) totalMin -= 60;

  // 분 단위 누적 → Date로 정규화 (UTC 산술, 날짜 rollover 포함).
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  d.setUTCMinutes(d.getUTCMinutes() + Math.round(totalMin));

  const Y = d.getUTCFullYear();
  const M = d.getUTCMonth() + 1;
  const D = d.getUTCDate();
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();

  // 야자시(한국 통용 default): 보정후 23:30~23:59 → 일주 +1일.
  const dayPillarShifted = h === 23 && m >= 30;

  return {
    Y,
    M,
    D,
    h,
    m,
    meta: {
      trueSolarLabel: `${formatDateStr(Y, M, D)} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      dstApplied: dstActive,
      longitudeMinutes: lonMin,
      eotMinutes: eotMin,
      dayPillarShifted,
      meridian,
    },
  };
}

// ───────────────────────── 메인 ─────────────────────────

/**
 * 사주 계산.
 *
 * @param year   4자리 (실용 1900~2050)
 * @param month  1-12
 * @param day    1-31
 * @param hour   0-23 (한국 표준시 가정). null이면 시주 미지 → ohaeng 카운트 시 시주 제외.
 * @param isLunar true면 입력이 음력
 * @param options minute / longitude / dst (모두 optional; 미지정 시 한국 표준 자동 보정)
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number | null,
  isLunar: boolean = false,
  options: SajuOptions = {},
): SajuResult {
  // 1) 양/음력 입력 → 60갑자 (year/month/lunarDate는 입력 양력 날짜 기준; 절입 정밀화는 범위 외).
  const cal = new KoreanLunarCalendar();
  if (isLunar) cal.setLunarDate(year, month, day, false);
  else cal.setSolarDate(year, month, day);

  const inputGapja = cal.getKoreanGapja() as {
    year: string;
    month: string;
    day: string;
    intercalation: string;
  };
  const yearPillar = makePillar(inputGapja.year);
  const monthPillar = makePillar(inputGapja.month);
  const inputDayPillar = makePillar(inputGapja.day);

  const lunar = cal.getLunarCalendar() as {
    year: number;
    month: number;
    day: number;
    intercalation: boolean;
  };
  const lunarDate = {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    intercalation: Boolean(lunar.intercalation),
  };

  // 2) 시간 미지: 시주 미지 + ohaeng 시주 제외.
  if (hour === null) {
    const ohaeng = countOhaeng([yearPillar, monthPillar, inputDayPillar]);
    return {
      year: yearPillar,
      month: monthPillar,
      day: inputDayPillar,
      hour: { unknown: true },
      ohaeng,
      deficient: findDeficient(ohaeng),
      excessive: findExcessive(ohaeng),
      lunarDate,
    };
  }

  // 3) 진태양시 보정 → 보정 진태양시 (Y, M, D, h, m).
  const minute = options.minute ?? 0;
  const longitude = options.longitude ?? SEOUL_LONGITUDE;
  const dst = options.dst ?? "auto";
  const corrected = applyTrueSolarCorrection(
    year,
    month,
    day,
    hour,
    minute,
    longitude,
    dst,
  );

  // 4) 일주: 진태양시 기준 양력 날짜 + 야자시 shift.
  //    (음력 입력이어도 일주 계산에는 보정 진태양시 양력 날짜만 사용.)
  const dayShift = corrected.meta.dayPillarShifted ? 1 : 0;
  const dayDate = new Date(
    Date.UTC(corrected.Y, corrected.M - 1, corrected.D + dayShift),
  );
  const dayCal = new KoreanLunarCalendar();
  dayCal.setSolarDate(
    dayDate.getUTCFullYear(),
    dayDate.getUTCMonth() + 1,
    dayDate.getUTCDate(),
  );
  const dayGapja = dayCal.getKoreanGapja() as { day: string };
  const dayPillar = makePillar(dayGapja.day);

  // 5) 시주: 보정 진태양시 30분 경계 시지 + 일주 천간 기준 시두법.
  const branchIdx = getHourBranchIndexFromMinutes(corrected.h, corrected.m);
  const hourPillar = makeHourPillarFromBranch(dayPillar.gan, branchIdx);

  const ohaeng = countOhaeng([yearPillar, monthPillar, dayPillar, hourPillar]);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    ohaeng,
    deficient: findDeficient(ohaeng),
    excessive: findExcessive(ohaeng),
    lunarDate,
    trueSolar: corrected.meta,
  };
}
