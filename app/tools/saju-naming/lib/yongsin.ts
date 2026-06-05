/**
 * 억부 용신 + 조후 보조 (B-3-c) — 결정론 단순화 작명 도구 모델.
 *
 * ⚠️ 본 모듈은 결정론 작명 도구 컨텍스트입니다. 정통 명리의 다중 학파별
 *    용신 조율을 단순화한 결정론 모델 — 추후 학파 plug-in 가능.
 *
 * [유파]
 *   적천수 + 한국 통용 절충 (격국·통관·병약 비채택).
 *   궁통보감 조후 우위 비채택 — 조후는 보조 메타로만 적용.
 *
 * [3분기 모델]
 *   신강 → 억부 (억제 그룹: 식상·재성·관성 중 사주 있는 것 우선)
 *   신약 → 억부 (보조 그룹: 인성·비겁 중 사주 있는 것 우선)
 *   중화(강변약·약변강) → 단순 카운트 유지 (B-3-c 미적용, ohaeng.ts에서 호출)
 *
 *   ⚠️ 중화 = 억부 무리 적용 회피. 정통 명리 시각상 중화 사주는
 *      억부 영향 약하고 통관·조후가 우선이라는 일반론 + 본 도구
 *      강약 모델(3원소 동등 가중) 한계 = 사월 병화 등 정통 신강
 *      판정 케이스가 강변약(중화)로 잡힐 수 있음 → 그 경우 단순
 *      카운트가 정통과 우연 정합.
 *
 * [강약 모델 한계]
 *   B-3-b 3원소 ON/OFF 모델은 월령 비중을 동등 가중. 정통 명리는
 *   월령을 다른 자리 2-3배로 봄. 따라서 월령에 강한 비겁/인성 있는
 *   케이스가 신약·중화로 잡힐 수 있음. 신뢰 출처 확보 시 월령 가중
 *   점수화 plug-in 후속 task.
 *
 * [조후]
 *   학파 일치 base만 채택: 해·자·축 → 화 / 사·오·미 → 수.
 *   진·술·인·신·묘·유는 미적용.
 *   yongsin/gisin 미오염 — 별도 메타(`johuMeta`)로 분리.
 *   recommend SQL은 yongsin만 사용 → 추천 풀 미오염.
 *   UI 표시에서 "조후 보조" 안내 (UI는 별도 task).
 *
 * [그룹 후보 선정 — 정통 (b)+(c) 절충]
 *   사주에 실제 존재(groupCount > 0)하는 그룹 우선, count desc 정렬.
 *   base 그룹 전부 count=0인 극단 케이스만 그룹 전체 fallback.
 *
 * [gisin]
 *   반대 그룹 전체 (사주 존재 무관). 강화 회피.
 *
 * 출처 (학파 일치 부분만 채택):
 *   - ko.wikipedia "용신(사주팔자)" CC BY-SA 4.0
 *   - postype.com/@saju-halang 조후 한난조습 표 (cross-ref)
 *   - 8-codes.com 만세력 15강 (한국 통용 자료 cross-ref)
 *   - 나무위키(CC BY-NC-SA) 미사용
 */

import type {
  Cheongan,
  Jiji,
  Ohaeng,
  OhaengBalance,
} from "./saju";
import { CHEONGAN_OHAENG } from "./saju";
import type { GangyakCategory, GangyakLabel, SajuGangyak } from "./gangyak";
import type { SajuSipsin, SipsinGroup } from "./sipsin";

// ───────────────── 타입 ─────────────────

export type YongsinMethod = "eokbu" | "simple-count";
export type JohuTendency = "한" | "난";
export type JohuConflict = "gisin" | "neutral" | null;
export type YongsinBaseGroup = "억제" | "보조" | null;

export interface YongsinMeta {
  /** 산출 방식 — 신강/신약은 "eokbu", 중화는 "simple-count". */
  readonly method: YongsinMethod;
  /** "억제"(신강) | "보조"(신약) | null(중화). */
  readonly baseGroup: YongsinBaseGroup;
  readonly gangyakLabel: GangyakLabel;
  readonly gangyakCategory: GangyakCategory;
}

export interface JohuMeta {
  /** 조후 보조 오행. */
  readonly ohaeng: Ohaeng;
  /** 한(겨울 해·자·축) / 난(여름 사·오·미). */
  readonly tendency: JohuTendency;
  /**
   * yongsin 포함 = null, gisin 포함 = "gisin", 둘 다 아님 = "neutral".
   * 우선순위: yongsin 검사 먼저 (Plan 결정 7건 명시).
   */
  readonly conflict: JohuConflict;
  /** UI에 조후 보조 안내할지 여부. gisin 충돌 시 false, 그 외 true. */
  readonly applied: boolean;
}

// ───────────────── 상수 ─────────────────

const OHAENG_GENERATES: Record<Ohaeng, Ohaeng> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const OHAENG_CONTROLS: Record<Ohaeng, Ohaeng> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

/** 일간 오행 기준 십신 그룹별 오행 매핑. */
function groupOhaengOf(dayOh: Ohaeng): Record<SipsinGroup, Ohaeng> {
  // 인성 = 일간을 생함 → OHAENG_GENERATES⁻¹[dayOh]
  let inseong: Ohaeng | undefined;
  for (const k of Object.keys(OHAENG_GENERATES) as Ohaeng[]) {
    if (OHAENG_GENERATES[k] === dayOh) {
      inseong = k;
      break;
    }
  }
  // 관성 = 일간을 극함 → OHAENG_CONTROLS⁻¹[dayOh]
  let gwanseong: Ohaeng | undefined;
  for (const k of Object.keys(OHAENG_CONTROLS) as Ohaeng[]) {
    if (OHAENG_CONTROLS[k] === dayOh) {
      gwanseong = k;
      break;
    }
  }
  if (!inseong || !gwanseong) {
    throw new Error(`groupOhaengOf: unreachable for ${dayOh}`);
  }
  return {
    비겁: dayOh,
    인성: inseong,
    식상: OHAENG_GENERATES[dayOh],
    재성: OHAENG_CONTROLS[dayOh],
    관성: gwanseong,
  };
}

/** 월지 → 조후 오행 + 한난 (학파 일치 base만). */
function johuOf(monthBranch: Jiji): { ohaeng: Ohaeng; tendency: JohuTendency } | null {
  if (monthBranch === "해" || monthBranch === "자" || monthBranch === "축") {
    return { ohaeng: "화", tendency: "한" };
  }
  if (monthBranch === "사" || monthBranch === "오" || monthBranch === "미") {
    return { ohaeng: "수", tendency: "난" };
  }
  return null;
}

// ───────────────── 단순 카운트 (중화 분기 + 외부 export) ─────────────────

const OHAENG_ORDER_LOCAL: readonly Ohaeng[] = ["목", "화", "토", "금", "수"] as const;

/** 오행 X를 생함(나를 생함)인 오행 반환. */
function generatedBy(o: Ohaeng): Ohaeng {
  for (const k of OHAENG_ORDER_LOCAL) {
    if (OHAENG_GENERATES[k] === o) return k;
  }
  throw new Error(`No generator found for ${o}`);
}

const DEFICIENT_THRESHOLD = 0.5;
const EXCESSIVE_THRESHOLD = 2.5;

/**
 * 단순 카운트 용신 (중화 분기 전용 — 기존 ohaeng.ts 로직 이관).
 *
 * 규칙 (B-1 이래 동일):
 *   1. deficient(≤ 0.5) → 직접 용신
 *   2. deficient를 생하는 오행 → 용신 (간접 보완)
 *   3. excessive(≥ 2.5) → 기신
 *   4. excessive를 생하는 오행 → 기신 (강화 회피)
 *   5. 충돌 시 기신 우선
 */
export function simpleCountYongsin(balance: OhaengBalance): {
  deficient: Ohaeng[];
  excessive: Ohaeng[];
  yongsin: Ohaeng[];
  gisin: Ohaeng[];
  nameDirection: string;
} {
  const deficient = OHAENG_ORDER_LOCAL.filter((o) => balance[o] <= DEFICIENT_THRESHOLD);
  const excessive = OHAENG_ORDER_LOCAL.filter((o) => balance[o] >= EXCESSIVE_THRESHOLD);

  const yongsinSet = new Set<Ohaeng>();
  for (const o of deficient) {
    yongsinSet.add(o);
    yongsinSet.add(generatedBy(o));
  }
  const gisinSet = new Set<Ohaeng>();
  for (const o of excessive) {
    gisinSet.add(o);
    gisinSet.add(generatedBy(o));
  }
  for (const o of gisinSet) yongsinSet.delete(o);

  const yongsin = OHAENG_ORDER_LOCAL.filter((o) => yongsinSet.has(o));
  const gisin = OHAENG_ORDER_LOCAL.filter((o) => gisinSet.has(o));
  const nameDirection =
    yongsin.length > 0
      ? `${yongsin.join("·")} 오행 한자 위주로 추천`
      : "오행 균형 — 의미 중심으로 추천";

  return { deficient, excessive, yongsin, gisin, nameDirection };
}

// ───────────────── 메인: evaluateYongsin ─────────────────

export interface YongsinResult {
  yongsin: Ohaeng[];
  gisin: Ohaeng[];
  deficient: Ohaeng[];
  excessive: Ohaeng[];
  nameDirection: string;
  yongsinMeta: YongsinMeta;
  johuMeta: JohuMeta | null;
}

export function evaluateYongsin(
  balance: OhaengBalance,
  dayStem: Cheongan,
  gangyak: SajuGangyak,
  monthBranch: Jiji,
  sipsin: SajuSipsin,
): YongsinResult {
  const dayOh = CHEONGAN_OHAENG[dayStem];
  const gMap = groupOhaengOf(dayOh);

  // 중화 분기 — 단순 카운트 유지 (B-3-c 미적용)
  if (gangyak.category === "중화") {
    const simple = simpleCountYongsin(balance);
    const johuMeta = buildJohuMeta(monthBranch, simple.yongsin, simple.gisin);
    return {
      yongsin: simple.yongsin,
      gisin: simple.gisin,
      deficient: simple.deficient,
      excessive: simple.excessive,
      nameDirection: simple.nameDirection,
      yongsinMeta: {
        method: "simple-count",
        baseGroup: null,
        gangyakLabel: gangyak.label,
        gangyakCategory: gangyak.category,
      },
      johuMeta,
    };
  }

  // 신강/신약 분기 — 억부 적용
  const isStrong = gangyak.category === "신강";
  const baseGroups: SipsinGroup[] = isStrong
    ? ["식상", "재성", "관성"]
    : ["인성", "비겁"];
  const oppoGroups: SipsinGroup[] = isStrong
    ? ["인성", "비겁"]
    : ["식상", "재성", "관성"];
  const baseGroup: YongsinBaseGroup = isStrong ? "억제" : "보조";

  // 사주에 있는 그룹 우선 (groupCount > 0, count desc 정렬)
  const candidates = baseGroups
    .map((g) => ({ group: g, ohaeng: gMap[g], count: sipsin.groupCounts[g] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const yongsin: Ohaeng[] =
    candidates.length > 0
      ? candidates.map((c) => c.ohaeng)
      : baseGroups.map((g) => gMap[g]); // fallback: base 그룹 전체

  // gisin = 반대 그룹 전체 (사주 존재 무관, 강화 회피)
  const gisin: Ohaeng[] = oppoGroups.map((g) => gMap[g]);

  // deficient/excessive는 단순 카운트 메타 그대로 유지 (참고용)
  const refSimple = simpleCountYongsin(balance);

  const nameDirection = `${gangyak.label} 사주 — ${yongsin.join("·")} 오행 한자 위주로 추천`;

  const johuMeta = buildJohuMeta(monthBranch, yongsin, gisin);

  return {
    yongsin,
    gisin,
    deficient: refSimple.deficient,
    excessive: refSimple.excessive,
    nameDirection,
    yongsinMeta: {
      method: "eokbu",
      baseGroup,
      gangyakLabel: gangyak.label,
      gangyakCategory: gangyak.category,
    },
    johuMeta,
  };
}

/**
 * 조후 메타 산출 (모든 분기 적용).
 *
 * conflict 우선순위 (Plan 결정 7건):
 *   yongsin 포함 검사 먼저 → null/applied=true
 *   다음 gisin 포함 → "gisin"/applied=false
 *   둘 다 아님 → "neutral"/applied=true
 */
function buildJohuMeta(
  monthBranch: Jiji,
  yongsin: Ohaeng[],
  gisin: Ohaeng[],
): JohuMeta | null {
  const j = johuOf(monthBranch);
  if (!j) return null;

  if (yongsin.includes(j.ohaeng)) {
    return { ohaeng: j.ohaeng, tendency: j.tendency, conflict: null, applied: true };
  }
  if (gisin.includes(j.ohaeng)) {
    return { ohaeng: j.ohaeng, tendency: j.tendency, conflict: "gisin", applied: false };
  }
  return { ohaeng: j.ohaeng, tendency: j.tendency, conflict: "neutral", applied: true };
}
