/**
 * 지장간 (地藏干) — 12지지에 숨은 천간 일수 분배 + 오행 점수 일수 비례 산출.
 *
 * 명리학 표준: 12지지 각각이 30일의 月期 동안 여기·중기·본기 천간이 분배된 일수만큼 지배.
 *   지지 1점(현 표면 카운트)을 지장간 각 천간의 일수 비례로 분해 → 오행 가중 정밀화.
 *   사주 8점 시스템 총합 보존 (천간 4 + 지지 4 = 8). 지지 표면 오행은 폐기 (본기와 중복).
 *
 * 출처:
 *   - 위키 "지장간" (CC BY-SA 4.0) — 12지지 × 여기/중기/본기 일수 표 verbatim.
 *     URL: https://ko.wikipedia.org/wiki/지장간 (취득 2026-06-04).
 *   - 명리학에서 지장간의 천간 구성과 일수 배속 고찰 (KCI ART002596264) — cross-ref.
 *
 * 학파 차이:
 *   - 午(왕지)만 일수 분배 다양 (위키 verbatim 본기 丁 11·중기 己 9·여기 丙 10). 균등(10·10·10)
 *     변형은 backlog plug-in (자원오행 C-5-4 패턴 적용 가능).
 *   - 월령 사령(월지 지장간의 절기 입절일부터 며칠 차에 따른 시기 가중)은 별도 task — 본
 *     모듈은 고정 일수 비례 (전 사주 동일).
 */

import {
  type Cheongan,
  CHEONGAN_OHAENG,
  type Jiji,
  type Ohaeng,
  type OhaengBalance,
} from "./saju";

export type JijangType = "여기" | "중기" | "본기";

export interface JijangEntry {
  /** 천간 (지장간 천간). */
  readonly stem: Cheongan;
  /** 30일 분모 기준 일수. */
  readonly days: number;
  /** 여기/중기/본기 구분 (UI/디버그용). */
  readonly type: JijangType;
}

/**
 * 12지지 × 지장간 일수 표 — 위키 verbatim (CC BY-SA 4.0).
 * 일수 합 = 30 (월기 30일 분배).
 *
 * 분류:
 *   생지(인·신·사·해): 본기 16 + 중기 7 + 여기 7
 *   왕지(자·오·묘·유): 자/묘/유 = 본기 20 + 여기 10 / 午 특수
 *   고지(축·진·미·술): 본기 18 + 중기 3 + 여기 9
 */
export const JIJANG_TABLE: Record<Jiji, ReadonlyArray<JijangEntry>> = {
  자: [
    { stem: "임", days: 10, type: "여기" },
    { stem: "계", days: 20, type: "본기" },
  ],
  축: [
    { stem: "계", days: 9, type: "여기" },
    { stem: "신", days: 3, type: "중기" },
    { stem: "기", days: 18, type: "본기" },
  ],
  인: [
    { stem: "무", days: 7, type: "여기" },
    { stem: "병", days: 7, type: "중기" },
    { stem: "갑", days: 16, type: "본기" },
  ],
  묘: [
    { stem: "갑", days: 10, type: "여기" },
    { stem: "을", days: 20, type: "본기" },
  ],
  진: [
    { stem: "을", days: 9, type: "여기" },
    { stem: "계", days: 3, type: "중기" },
    { stem: "무", days: 18, type: "본기" },
  ],
  사: [
    { stem: "무", days: 7, type: "여기" },
    { stem: "경", days: 7, type: "중기" },
    { stem: "병", days: 16, type: "본기" },
  ],
  오: [
    // 午(午) 특수: 본기 11일 / 중기 9일 / 여기 10일 (위키 verbatim).
    { stem: "병", days: 10, type: "여기" },
    { stem: "기", days: 9, type: "중기" },
    { stem: "정", days: 11, type: "본기" },
  ],
  미: [
    { stem: "정", days: 9, type: "여기" },
    { stem: "을", days: 3, type: "중기" },
    { stem: "기", days: 18, type: "본기" },
  ],
  신: [
    { stem: "무", days: 7, type: "여기" },
    { stem: "임", days: 7, type: "중기" },
    { stem: "경", days: 16, type: "본기" },
  ],
  유: [
    { stem: "경", days: 10, type: "여기" },
    { stem: "신", days: 20, type: "본기" },
  ],
  술: [
    { stem: "신", days: 9, type: "여기" },
    { stem: "정", days: 3, type: "중기" },
    { stem: "무", days: 18, type: "본기" },
  ],
  해: [
    { stem: "무", days: 7, type: "여기" },
    { stem: "갑", days: 7, type: "중기" },
    { stem: "임", days: 16, type: "본기" },
  ],
};

/**
 * 지지 1개의 지장간 일수 비례 오행 점수 기여 (합 = 1.0).
 * 지지 표면 점수 1점이 지장간 각 천간의 (일수/30)로 오행 점수에 분해.
 *
 * 예: 자 → 壬(수) 10/30 + 癸(수) 20/30 = 수 1.0 (전부 수)
 *     축 → 癸(수) 9/30 + 辛(금) 3/30 + 己(토) 18/30 = 수 0.3 + 금 0.1 + 토 0.6
 *     인 → 戊(토) 7/30 + 丙(화) 7/30 + 甲(목) 16/30 = 토 0.233 + 화 0.233 + 목 0.534
 */
export function getJijangContributions(jiji: Jiji): OhaengBalance {
  const acc: OhaengBalance = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const entry of JIJANG_TABLE[jiji]) {
    const o: Ohaeng = CHEONGAN_OHAENG[entry.stem];
    acc[o] += entry.days / 30;
  }
  return acc;
}
