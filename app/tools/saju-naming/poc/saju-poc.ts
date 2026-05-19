/**
 * Saju (사주팔자) calculation PoC — Step 1 검증용.
 *
 * 의존성: `korean-lunar-calendar` (Workers 호환).
 * - 음력 ↔ 양력 변환 + 60갑자 (年柱/月柱/日柱) 산출.
 * - 시주(時柱)는 일간 기준 자체 계산 (라이브러리 미제공).
 *
 * 실행: ts-node app/tools/saju-naming/poc/saju-poc.ts
 * 또는 Workers route에서 import해서 호출.
 */

// @ts-expect-error — korean-lunar-calendar는 타입 정의 없음 (런타임 검증 PoC)
import KoreanLunarCalendar from "korean-lunar-calendar";

// ───────────────────────── 상수 ─────────────────────────

export const CHEONGAN = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;
export type Cheongan = (typeof CHEONGAN)[number];

export const JIJI = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;
export type Jiji = (typeof JIJI)[number];

export type Wuxing = "wood" | "fire" | "earth" | "metal" | "water";

// 천간 → 오행
const WUXING_FROM_STEM: Record<Cheongan, Wuxing> = {
  甲: "wood", 乙: "wood",
  丙: "fire", 丁: "fire",
  戊: "earth", 己: "earth",
  庚: "metal", 辛: "metal",
  壬: "water", 癸: "water",
};

// 지지 → 오행
const WUXING_FROM_BRANCH: Record<Jiji, Wuxing> = {
  寅: "wood", 卯: "wood",
  巳: "fire", 午: "fire",
  辰: "earth", 戌: "earth", 丑: "earth", 未: "earth",
  申: "metal", 酉: "metal",
  亥: "water", 子: "water",
};

// 시지 (시간대 → 12지지). 23:00–00:59 = 子, 01:00–02:59 = 丑, ...
const HOUR_TO_BRANCH: Jiji[] = [
  "子", // 23-01
  "丑", // 01-03
  "寅", // 03-05
  "卯", // 05-07
  "辰", // 07-09
  "巳", // 09-11
  "午", // 11-13
  "未", // 13-15
  "申", // 15-17
  "酉", // 17-19
  "戌", // 19-21
  "亥", // 21-23
];

function hourToBranchIndex(hour: number): number {
  // 자시 경계: 23시-1시 = 子 (index 0)
  // (hour + 1) / 2 — 23시 → 12 → mod 12 = 0
  return Math.floor(((hour + 1) % 24) / 2);
}

// 시주 천간 = 일간 기준 + 시지 index. 일간별 子시 천간 시작:
// 甲己日 → 甲子 시작, 乙庚日 → 丙子, 丙辛日 → 戊子, 丁壬日 → 庚子, 戊癸日 → 壬子.
const DAY_STEM_HOUR_BASE: Record<Cheongan, Cheongan> = {
  甲: "甲", 己: "甲",
  乙: "丙", 庚: "丙",
  丙: "戊", 辛: "戊",
  丁: "庚", 壬: "庚",
  戊: "壬", 癸: "壬",
};

// ───────────────────────── 타입 ─────────────────────────

export interface Pillar {
  stem: Cheongan;
  branch: Jiji;
  gapja: string; // 예: "甲子"
}

export type WuxingCount = Record<Wuxing, number>;

export interface SajuResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  wuxingCount: WuxingCount;
  missing: Wuxing[]; // 0개인 오행
  excess: Wuxing[]; // 3개 이상인 오행
  // 입력 echo
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    isLunar: boolean;
  };
}

// ───────────────────────── 시주 계산 ─────────────────────────

function calcHourPillar(dayStem: Cheongan, hour: number): Pillar {
  const branchIdx = hourToBranchIndex(hour);
  const branch = HOUR_TO_BRANCH[branchIdx];
  const baseStem = DAY_STEM_HOUR_BASE[dayStem];
  const baseStemIdx = CHEONGAN.indexOf(baseStem);
  const stemIdx = (baseStemIdx + branchIdx) % 10;
  const stem = CHEONGAN[stemIdx];
  return { stem, branch, gapja: `${stem}${branch}` };
}

// ───────────────────────── 갑자 문자열 파싱 ─────────────────────────

function parseGapja(gapja: string): Pillar {
  // 예: "甲子" — 길이 2 한자
  const stem = gapja.charAt(0) as Cheongan;
  const branch = gapja.charAt(1) as Jiji;
  return { stem, branch, gapja };
}

// ───────────────────────── 오행 집계 ─────────────────────────

function countWuxing(pillars: Pillar[]): WuxingCount {
  const count: WuxingCount = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  for (const p of pillars) {
    count[WUXING_FROM_STEM[p.stem]] += 1;
    count[WUXING_FROM_BRANCH[p.branch]] += 1;
  }
  return count;
}

function findMissing(count: WuxingCount): Wuxing[] {
  return (Object.keys(count) as Wuxing[]).filter((w) => count[w] === 0);
}

function findExcess(count: WuxingCount, threshold = 3): Wuxing[] {
  return (Object.keys(count) as Wuxing[]).filter((w) => count[w] >= threshold);
}

// ───────────────────────── 메인 API ─────────────────────────

/**
 * @param year 4-digit year (예: 1959)
 * @param month 1-12
 * @param day 1-31
 * @param hour 0-23
 * @param isLunar true면 음력 입력, false면 양력 입력
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number,
  isLunar: boolean,
): SajuResult {
  const cal = new KoreanLunarCalendar();
  if (isLunar) {
    cal.setLunarDate(year, month, day, false); // false = 평달 (윤달 false)
  } else {
    cal.setSolarDate(year, month, day);
  }

  const gapja = cal.getKoreanGapja();
  // korean-lunar-calendar의 getKoreanGapja()는
  // { yearGapja, monthGapja, dayGapja, ... } 형태로 반환.
  const yearPillar = parseGapja(gapja.yearGapja);
  const monthPillar = parseGapja(gapja.monthGapja);
  const dayPillar = parseGapja(gapja.dayGapja);
  const hourPillar = calcHourPillar(dayPillar.stem, hour);

  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const wuxingCount = countWuxing(pillars);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    wuxingCount,
    missing: findMissing(wuxingCount),
    excess: findExcess(wuxingCount),
    input: { year, month, day, hour, isLunar },
  };
}

// ───────────────────────── 테스트 ─────────────────────────

// 노드에서 직접 실행 시: ts-node saju-poc.ts
// import.meta 검사 대신 단순 require.main 체크는 ESM/CJS 둘 다 깨질 수 있어
// 항상 export만 하고, 검증은 별도 호출자에서.

if (typeof process !== "undefined" && process.argv[1]?.includes("saju-poc")) {
  // 1959-05-15 09:00 양력
  const result = calculateSaju(1959, 5, 15, 9, false);
  console.log("Input: 1959-05-15 09:00 (양력)");
  console.log("年柱:", result.year.gapja);
  console.log("月柱:", result.month.gapja);
  console.log("日柱:", result.day.gapja);
  console.log("時柱:", result.hour.gapja);
  console.log("오행 카운트:", result.wuxingCount);
  console.log("부족:", result.missing);
  console.log("과다:", result.excess);
}
