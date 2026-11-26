/**
 * 오행 분석 — 용신/기신 결정 (B-3-c 격상).
 *
 * 본 모듈은 thin wrapper. 실제 용신 산출은 `lib/yongsin.ts`로 위임:
 *   - 신강/신약 → 억부 용신 (그룹 후보 = 사주에 있는 것 우선, count desc 정렬)
 *   - 중화(강변약·약변강) → 단순 카운트 유지 (B-3-c 미적용)
 *   - 조후 보조 → 별도 메타 `johuMeta` (yongsin/gisin 미오염, recommend SQL 미영향)
 *
 * 단순 카운트 로직 자체는 `lib/yongsin.ts` `simpleCountYongsin`으로 이관 (중화 분기 재사용).
 *
 * 이전 임계 (B-1, 2026-06-04 격상): 지장간 일수 비례 fraction → deficient ≤ 0.5 / excessive ≥ 2.5.
 * 본 임계는 중화 분기(단순 카운트) 내부에서 계속 사용. 억부 분기는 강약 라벨(B-3-b) 기반.
 *
 * 출처 docstring은 `lib/yongsin.ts` 참조.
 */

import type { Cheongan, Jiji, Ohaeng, OhaengBalance } from "./saju";
import type { SajuGangyak } from "./gangyak";
import type { SajuSipsin } from "./sipsin";
import {
  evaluateYongsin,
  type JohuMeta,
  type YongsinMeta,
} from "./yongsin";

// ───────────────────────── 상수 (외부 노출 보존) ─────────────────────────

export const OHAENG_ORDER: readonly Ohaeng[] = [
  "목",
  "화",
  "토",
  "금",
  "수",
] as const;

// 상생: 내가 생하는 것
export const OHAENG_GENERATES: Record<Ohaeng, Ohaeng> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

// 상극: 내가 극하는 것
export const OHAENG_CONTROLS: Record<Ohaeng, Ohaeng> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
};

// ───────────────────────── 타입 ─────────────────────────

export interface OhaengAnalysis {
  balance: OhaengBalance;
  deficient: Ohaeng[]; // count ≤ 0.5 (참고 메타 — 단순 카운트 기반)
  excessive: Ohaeng[]; // count ≥ 2.5 (참고 메타)
  yongsin: Ohaeng[]; // 이름에 넣으면 좋은 오행 (억부 또는 단순 카운트, method 참조)
  gisin: Ohaeng[]; // 이름에 피해야 할 오행
  nameDirection: string; // 한 줄 요약
  /** B-3-c 신규: 용신 산출 방식 메타. */
  yongsinMeta: YongsinMeta;
  /** B-3-c 신규: 조후 보조 메타 (월령 한·난). null = 환절기. */
  johuMeta: JohuMeta | null;
}

// ───────────────────────── 메인 ─────────────────────────

/**
 * 사주 오행 + 강약 + 일간/월지 → 용신/기신 분석.
 *
 * @param balance     오행 8점 분포 (지장간 일수 비례).
 * @param dayStem     일간(일주 천간).
 * @param gangyak     B-3-b 강약 결과 (신강/중화/신약 분기 결정).
 * @param monthBranch 월지(조후 메타용).
 * @param sipsin      B-3-a 십신 결과 (groupCounts — 그룹 후보 정렬).
 */
export function analyzeOhaeng(
  balance: OhaengBalance,
  dayStem: Cheongan,
  gangyak: SajuGangyak,
  monthBranch: Jiji,
  sipsin: SajuSipsin,
): OhaengAnalysis {
  const r = evaluateYongsin(balance, dayStem, gangyak, monthBranch, sipsin);
  return {
    balance,
    deficient: r.deficient,
    excessive: r.excessive,
    yongsin: r.yongsin,
    gisin: r.gisin,
    nameDirection: r.nameDirection,
    yongsinMeta: r.yongsinMeta,
    johuMeta: r.johuMeta,
  };
}

// 검증은 `poc/saju-poc.test.ts`로 분리됨.
