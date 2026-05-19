/**
 * 오행 분석 — 용신/기신 결정.
 *
 * 상생: 목→화→토→금→수→목 (내가 생하는 것)
 * 상극: 목극토, 토극수, 수극화, 화극금, 금극목 (내가 극하는 것)
 *
 * 용신/기신 결정 규칙 (단순화):
 *   1. deficient(== 0) 오행 → 직접 용신
 *   2. deficient를 상생해주는(생기는 쪽) 오행 → 용신 (간접 보완)
 *   3. excessive(≥ 3) 오행 → 기신
 *   4. excessive를 상생해주는 오행 → 기신 (강화하므로 피함)
 *   5. 충돌 시 기신 우선 (과다 오행을 더 강화하는 건 피함이 핵심)
 */

import type { Ohaeng, OhaengBalance } from "./saju";

// ───────────────────────── 상수 ─────────────────────────

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

// 역매핑: 나를 생하는 것 (e.g. 수는 금이 생함)
function generatedBy(o: Ohaeng): Ohaeng {
  for (const k of OHAENG_ORDER) {
    if (OHAENG_GENERATES[k] === o) return k;
  }
  throw new Error(`No generator found for ${o}`);
}

// ───────────────────────── 타입 ─────────────────────────

export interface OhaengAnalysis {
  balance: OhaengBalance;
  deficient: Ohaeng[]; // count === 0
  excessive: Ohaeng[]; // count >= 3
  yongsin: Ohaeng[]; // 이름에 넣으면 좋은 오행
  gisin: Ohaeng[]; // 이름에 피해야 할 오행
  nameDirection: string; // 한 줄 요약
}

// ───────────────────────── 메인 ─────────────────────────

export function analyzeOhaeng(balance: OhaengBalance): OhaengAnalysis {
  const deficient = OHAENG_ORDER.filter((o) => balance[o] === 0);
  const excessive = OHAENG_ORDER.filter((o) => balance[o] >= 3);

  // 용신 후보 수집
  const yongsinSet = new Set<Ohaeng>();
  for (const o of deficient) {
    yongsinSet.add(o);
    yongsinSet.add(generatedBy(o));
  }

  // 기신 후보 수집
  const gisinSet = new Set<Ohaeng>();
  for (const o of excessive) {
    gisinSet.add(o);
    gisinSet.add(generatedBy(o));
  }

  // 충돌 처리: 기신 우선 — 과다 오행을 강화하는 건 절대 피함이 핵심.
  for (const o of gisinSet) {
    yongsinSet.delete(o);
  }

  const yongsin = OHAENG_ORDER.filter((o) => yongsinSet.has(o));
  const gisin = OHAENG_ORDER.filter((o) => gisinSet.has(o));

  const nameDirection =
    yongsin.length > 0
      ? `${yongsin.join("·")} 오행 한자 위주로 추천`
      : "오행 균형 — 의미 중심으로 추천";

  return {
    balance,
    deficient,
    excessive,
    yongsin,
    gisin,
    nameDirection,
  };
}

// 검증은 `poc/ohaeng-poc.test.ts`로 분리됨 (Edge runtime 호환).
