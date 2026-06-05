/**
 * 오행 분석 — 용신/기신 결정.
 *
 * 상생: 목→화→토→금→수→목 (내가 생하는 것)
 * 상극: 목극토, 토극수, 수극화, 화극금, 금극목 (내가 극하는 것)
 *
 * 용신/기신 결정 규칙 (단순화):
 *   1. deficient(≤ 0.5) 오행 → 직접 용신
 *   2. deficient를 상생해주는(생기는 쪽) 오행 → 용신 (간접 보완)
 *   3. excessive(≥ 2.5) 오행 → 기신
 *   4. excessive를 상생해주는 오행 → 기신 (강화하므로 피함)
 *   5. 충돌 시 기신 우선 (과다 오행을 더 강화하는 건 피함이 핵심)
 *
 * 임계 (B-1, 2026-06-04 격상): 지장간 일수 비례 fraction 점수 도입 →
 *   deficient ≤ 0.5 / excessive ≥ 2.5 (saju.ts findDeficient/Excessive 동일 임계로 통일).
 *   억부 용신 격상(B-3)에서 일간 강약 기반 휴리스틱으로 재검토 예정.
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
  deficient: Ohaeng[]; // count ≤ 0.5 (B-1 격상, 지장간 일수 비례)
  excessive: Ohaeng[]; // count ≥ 2.5
  yongsin: Ohaeng[]; // 이름에 넣으면 좋은 오행
  gisin: Ohaeng[]; // 이름에 피해야 할 오행
  nameDirection: string; // 한 줄 요약
}

const DEFICIENT_THRESHOLD = 0.5;
const EXCESSIVE_THRESHOLD = 2.5;

// ───────────────────────── 메인 ─────────────────────────

export function analyzeOhaeng(balance: OhaengBalance): OhaengAnalysis {
  const deficient = OHAENG_ORDER.filter((o) => balance[o] <= DEFICIENT_THRESHOLD);
  const excessive = OHAENG_ORDER.filter((o) => balance[o] >= EXCESSIVE_THRESHOLD);

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
