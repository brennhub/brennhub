/**
 * 십신 (十神) — 일간(日干) 기준 다른 천간의 오행·음양 관계 분류.
 *
 * 명리학 사주 분석의 핵심 분류 체계. 일간(나)과 다른 천간(타자) 사이의 관계를
 * 오행 상생/상극 × 음양 동/이로 10가지로 분류. 강약 판정(B-3-b)·억부 용신(B-3-c)의
 * 기초 재료.
 *
 * 본 모듈 (B-3-a): 십신 매핑 + 사주 8글자(+지장간) 십신 산출 → 표시만.
 *   추천 영향 0 (감지+표시). 강약·용신 격상은 별도 task.
 *
 * 출처 (학파 일치 — 정의 표준):
 *   - ko.wikipedia "십성 (사주팔자)" (CC BY-SA 4.0) verbatim.
 *     URL: https://ko.wikipedia.org/wiki/십성_(사주팔자) (취득 2026-06-04).
 *   - sajustudy.com 십신 정리 표 cross-ref (https://www.sajustudy.com/53).
 *   - 나무위키(CC BY-NC-SA) 미사용.
 *
 * 5 그룹 분류:
 *   비겁(比劫) = 비견 + 겁재
 *   식상(食傷) = 식신 + 상관
 *   재성(財星) = 편재 + 정재
 *   관성(官星) = 편관 + 정관
 *   인성(印星) = 편인 + 정인
 *
 * 천간 음양 분류 (학파 일치):
 *   양(陽): 갑·병·무·경·임
 *   음(陰): 을·정·기·신·계
 */

import {
  type Cheongan,
  CHEONGAN_OHAENG,
  type Jiji,
  type Ohaeng,
  type Pillar,
} from "./saju";
import { JIJANG_TABLE } from "./jijang";

// ───────────────── 십신 타입 ─────────────────

export type Sipsin =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

export type SipsinGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

export type StemYinYang = "양" | "음";

// ───────────────── 표 ─────────────────

/** 천간 음양 분류 (학파 일치, 위키 verbatim). */
export const STEM_YIN_YANG: Record<Cheongan, StemYinYang> = {
  갑: "양",
  을: "음",
  병: "양",
  정: "음",
  무: "양",
  기: "음",
  경: "양",
  신: "음",
  임: "양",
  계: "음",
};

/** 오행 상생: 내가 생함. (saju.ts/ohaeng.ts와 일관 — 중복 정의 회피 위해 inline.) */
const OHAENG_GENERATES_LOCAL: Record<Ohaeng, Ohaeng> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

/** 오행 상극: 내가 극함. */
const OHAENG_CONTROLS_LOCAL: Record<Ohaeng, Ohaeng> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

// ───────────────── 매핑 ─────────────────

/**
 * 일간(dayStem)과 다른 천간(otherStem) 사이의 십신 분류.
 *
 * 규칙 (위키 verbatim, 학파 일치):
 *   같은 오행 + 같은 음양 = 비견 / + 다른 음양 = 겁재
 *   일간이 생 + 같은 음양 = 식신 / + 다른 음양 = 상관
 *   일간이 극 + 같은 음양 = 편재 / + 다른 음양 = 정재
 *   일간을 극 + 같은 음양 = 편관(七殺) / + 다른 음양 = 정관
 *   일간을 생 + 같은 음양 = 편인(梟神) / + 다른 음양 = 정인
 */
export function getSipsin(dayStem: Cheongan, otherStem: Cheongan): Sipsin {
  const dayOh = CHEONGAN_OHAENG[dayStem];
  const otherOh = CHEONGAN_OHAENG[otherStem];
  const sameYY = STEM_YIN_YANG[dayStem] === STEM_YIN_YANG[otherStem];

  if (dayOh === otherOh) return sameYY ? "비견" : "겁재";
  if (OHAENG_GENERATES_LOCAL[dayOh] === otherOh) return sameYY ? "식신" : "상관";
  if (OHAENG_CONTROLS_LOCAL[dayOh] === otherOh) return sameYY ? "편재" : "정재";
  if (OHAENG_CONTROLS_LOCAL[otherOh] === dayOh) return sameYY ? "편관" : "정관";
  // 남은 경우: otherStem이 일간을 생함 (즉 OHAENG_GENERATES_LOCAL[otherOh] === dayOh)
  return sameYY ? "편인" : "정인";
}

/** 십신 → 5 그룹 분류. */
export function getSipsinGroup(s: Sipsin): SipsinGroup {
  if (s === "비견" || s === "겁재") return "비겁";
  if (s === "식신" || s === "상관") return "식상";
  if (s === "편재" || s === "정재") return "재성";
  if (s === "편관" || s === "정관") return "관성";
  return "인성";
}

// ───────────────── 사주 십신 산출 ─────────────────

export interface JijangSipsinEntry {
  /** 지장간 천간. */
  readonly stem: Cheongan;
  /** 그 천간의 십신 (일간 기준). */
  readonly sipsin: Sipsin;
  /** 30일 분모 기준 일수 (지장간 표). */
  readonly days: number;
  /** 여기/중기/본기 구분. */
  readonly type: "여기" | "중기" | "본기";
}

export interface PillarSipsin {
  /** 천간 십신 (일간 기준). 일주 천간은 일간 자신 = 비견. */
  readonly stemSipsin: Sipsin;
  /** 지지 지장간 십신 (B-1 지장간 표 일수 비례). */
  readonly jijangSipsin: ReadonlyArray<JijangSipsinEntry>;
}

export interface SajuSipsin {
  /** 일간 천간 (참고). */
  readonly dayStem: Cheongan;
  readonly year: PillarSipsin;
  readonly month: PillarSipsin;
  readonly day: PillarSipsin;
  /** 시간 미지(hour: { unknown: true }) 시 undefined. */
  readonly hour?: PillarSipsin;
  /**
   * 5 그룹별 일수 비례 카운트 (8점 시스템에 대응 — 천간 1점 + 지지 지장간 일수 비례).
   * 강약(B-3-b)·용신(B-3-c) 진입 시 raw 재료로 사용.
   */
  readonly groupCounts: Record<SipsinGroup, number>;
}

/** 한 기둥(Pillar)의 십신 산출. */
function getPillarSipsin(dayStem: Cheongan, pillar: Pillar): PillarSipsin {
  const stemSipsin = getSipsin(dayStem, pillar.gan);
  const jijangSipsin: JijangSipsinEntry[] = [];
  for (const entry of JIJANG_TABLE[pillar.ji]) {
    jijangSipsin.push({
      stem: entry.stem,
      sipsin: getSipsin(dayStem, entry.stem),
      days: entry.days,
      type: entry.type,
    });
  }
  return { stemSipsin, jijangSipsin };
}

/**
 * 사주 4기둥(+지장간) 십신 산출 + 5 그룹별 일수 비례 카운트.
 *
 * @param dayStem 일간(일주 천간).
 * @param pillars year/month/day [+ hour] 기둥. hour 없으면 3 pillar.
 */
export function getSajuSipsin(
  dayStem: Cheongan,
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour?: Pillar;
  },
): SajuSipsin {
  const yearSp = getPillarSipsin(dayStem, pillars.year);
  const monthSp = getPillarSipsin(dayStem, pillars.month);
  const daySp = getPillarSipsin(dayStem, pillars.day);
  const hourSp = pillars.hour ? getPillarSipsin(dayStem, pillars.hour) : undefined;

  // 5 그룹별 일수 비례 카운트 (천간 1점 + 지지 지장간 일수 비례 / 30).
  const groupCounts: Record<SipsinGroup, number> = {
    비겁: 0,
    식상: 0,
    재성: 0,
    관성: 0,
    인성: 0,
  };
  const add = (sp: PillarSipsin): void => {
    groupCounts[getSipsinGroup(sp.stemSipsin)] += 1;
    for (const entry of sp.jijangSipsin) {
      groupCounts[getSipsinGroup(entry.sipsin)] += entry.days / 30;
    }
  };
  add(yearSp);
  add(monthSp);
  add(daySp);
  if (hourSp) add(hourSp);

  return {
    dayStem,
    year: yearSp,
    month: monthSp,
    day: daySp,
    ...(hourSp ? { hour: hourSp } : {}),
    groupCounts,
  };
}
