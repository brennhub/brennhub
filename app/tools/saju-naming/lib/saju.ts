/**
 * 사주 (四柱) 계산 — 한글 표기.
 *
 * 의존성: korean-lunar-calendar (한국천문연구원 기준).
 * 한자 표기는 패키지의 getChineseGapja(), 한글은 getKoreanGapja() 사용.
 * 본 모듈은 한글 사용.
 */

// npm 패키지의 `exports` 필드가 `"import"` 조건을 정의하지 않아 Workers Edge
// runtime의 모든 import 형태 (default/namespace/internal path)가 실패.
// → ESM bundle을 도구 내 `vendor/`로 복사 + relative path. 자세한 경위는
// `lib/vendor/README.md`. CHANGELOG `0.5.1`/`0.5.2`.
import KoreanLunarCalendar from "./vendor/korean-lunar-calendar.js";

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

// ───────────────────────── 타입 ─────────────────────────

export interface Pillar {
  gan: Cheongan;
  ji: Jiji;
  ganOhaeng: Ohaeng;
  jiOhaeng: Ohaeng;
  label: string; // 예: "기미"
}

export interface OhaengBalance {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
}

export interface SajuResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  ohaeng: OhaengBalance;
  deficient: Ohaeng[]; // ≤1개
  excessive: Ohaeng[]; // ≥3개
  lunarDate: {
    year: number;
    month: number;
    day: number;
    intercalation: boolean;
  };
}

// ───────────────────────── 헬퍼 ─────────────────────────

/**
 * 시간 → 시지 index (0=子, 1=丑, ...).
 * 23시는 子時 (0), 0-1시는 子, 1-3시는 丑, ...
 */
export function getHourBranchIndex(hour: number): number {
  if (hour === 23) return 0;
  return Math.floor((hour + 1) / 2);
}

/**
 * "기미년", "병오월", "임오일" 같은 3글자 문자열에서 첫 글자(천간) + 두 번째 글자(지지) 추출.
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

function makeHourPillar(dayStem: Cheongan, hour: number): Pillar {
  const branchIdx = getHourBranchIndex(hour);
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

// ───────────────────────── 메인 ─────────────────────────

/**
 * 사주 계산.
 * @param year 4-digit year
 * @param month 1-12
 * @param day 1-31
 * @param hour 0-23 (null이면 시주 생략 — 미구현, 일단 0시 기본)
 * @param isLunar true면 입력이 음력
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number | null,
  isLunar: boolean = false,
): SajuResult {
  const cal = new KoreanLunarCalendar();
  if (isLunar) {
    cal.setLunarDate(year, month, day, false);
  } else {
    cal.setSolarDate(year, month, day);
  }

  const gapja = cal.getKoreanGapja() as {
    year: string;
    month: string;
    day: string;
    intercalation: string;
  };
  const yearPillar = makePillar(gapja.year);
  const monthPillar = makePillar(gapja.month);
  const dayPillar = makePillar(gapja.day);
  const hourPillar = makeHourPillar(dayPillar.gan, hour ?? 0);

  const ohaeng = countOhaeng([yearPillar, monthPillar, dayPillar, hourPillar]);

  const lunar = cal.getLunarCalendar() as {
    year: number;
    month: number;
    day: number;
    intercalation: boolean;
  };

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    ohaeng,
    deficient: findDeficient(ohaeng),
    excessive: findExcessive(ohaeng),
    lunarDate: {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      intercalation: Boolean(lunar.intercalation),
    },
  };
}
