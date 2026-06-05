/**
 * 일간 강약 판정 (B-3-b) — 3원소 ON/OFF (득령·득지·득세) → 8분류 라벨 + 3단 분류.
 *
 * ⚠️ 본 모듈은 결정론 단순화 모델입니다. 정통 명리학의 강약 판정은 일반적으로
 *    월령·지지·천간·지장간·통근 깊이·합충 영향 등을 종합 점수(가중치)로
 *    저울질해 신강/신약/중화를 가립니다. 점수 가중치는 자료마다 차이가 크고
 *    공인 표준이 없어(예: sajulink·forceteller·postype 자료별 월지 30점 vs
 *    그 외 가중치가 다름) 결정론적 채택이 어렵습니다.
 *    → brennhub은 신뢰 출처가 확보될 때까지 점수화를 회피하고
 *      "득령·득지·득세 3원소 boolean × 8분류 매핑" 결정 모델을 채택합니다.
 *    추후 학파 점수표가 명시될 경우 plug-in으로 추가 가능.
 *
 * 본 모듈 (B-3-b): 강약 산출 → 표시만. 추천 영향 0 (현 단순 카운트 용신 보존).
 *   억부 용신(B-3-c)에서 본 결과를 입력으로 용신 그룹을 결정할 예정.
 *
 * 출처 (3원소 정의는 학파 일치 부분만 채택):
 *   - sajuyukhyo.co.kr — 득령/득지/득세 정의
 *   - brunch.co.kr/@sajuwiki/37 — 강약 8분류 한국 통용 매핑
 *   - postype.com (사주덕·동방신기) — 한국 통용 강약 판별 자료 (cross-ref)
 *   - 나무위키(CC BY-NC-SA) 미사용
 *
 * brennhub 채택 정의 (결정론):
 *   득령(得令): 월지 본기 오행이 일간 오행과 같음(비겁) 또는 일간을 생함(인성).
 *              ⚠️ 본기 채택 — 중기·여기 가중은 학파 차이 있어 결정론 우선.
 *   득지(得地): 일지 지장간(여/중/본기 모두) 중 일간 오행 또는 일간 생오행이
 *              하나라도 존재(통근).
 *              ⚠️ 폭넓은 통근 — 약한 통근도 인정 (한국 통용 일반 채택).
 *   득세(得勢): 월지·일지 외 자리(연지·시지 + 일간 외 천간 3 + 그 자리의 지장간)
 *              에서 (비겁 + 인성) groupCount > (식상 + 재성 + 관성) groupCount.
 *              ⚠️ 임계값 회피 — 단순 대소 비교.
 *
 * 8분류 매핑 표 (brennhub 채택, 자료별 미세 차이 존재):
 *   득령 O · 득지 O · 득세 O → 최강 (신강)
 *   득령 O · 득지 O · 득세 X → 강 (신강)
 *   득령 O · 득지 X · 득세 O → 중강 (신강)
 *   득령 O · 득지 X · 득세 X → 강변약 (중화 경향 약)
 *   득령 X · 득지 O · 득세 O → 약변강 (중화 경향 강)
 *   득령 X · 득지 O · 득세 X → 약 (신약)
 *   득령 X · 득지 X · 득세 O → 중약 (신약)
 *   득령 X · 득지 X · 득세 X → 최약 (신약)
 *
 * 합충 영향 (충→통근 손상, 합→통근 강화 등)은 본 모듈 미반영. 학파 차이가
 * 매우 커 결정 보류 — 별도 task에서 결정 시 plug-in.
 */

import {
  CHEONGAN_OHAENG,
  type Cheongan,
  type Ohaeng,
  type Pillar,
} from "./saju";
import { JIJANG_TABLE } from "./jijang";
import type { SajuSipsin } from "./sipsin";
import { getSipsin, getSipsinGroup } from "./sipsin";

// ───────────────── 타입 ─────────────────

export type GangyakLabel =
  | "최강"
  | "강"
  | "중강"
  | "강변약"
  | "약변강"
  | "약"
  | "중약"
  | "최약";

export type GangyakCategory = "신강" | "중화" | "신약";

export interface GangyakRaw {
  /** 월지 본기 천간. */
  readonly monthMainStem: Cheongan;
  /** 월지 본기 오행. */
  readonly monthMainOhaeng: Ohaeng;
  /** 일지 지장간 (전체 — 통근 판정 입력). */
  readonly dayJijang: ReadonlyArray<{ stem: Cheongan; ohaeng: Ohaeng; days: number }>;
  /** 월·일지 외 자리의 (비겁+인성) 일수 비례 합. */
  readonly supportCount: number;
  /** 월·일지 외 자리의 (식상+재성+관성) 일수 비례 합. */
  readonly drainCount: number;
}

export interface SajuGangyak {
  /** 득령: 월지 본기 오행이 일간 비겁(같음)/인성(생). */
  readonly deuglyeong: boolean;
  /** 득지: 일지 지장간 중 일간 비겁/인성 천간이 하나라도 존재(통근). */
  readonly deukji: boolean;
  /** 득세: 월·일지 외 자리에서 (비겁+인성) > (식상+재성+관성). */
  readonly deukse: boolean;
  /** 8분류 라벨 (3 boolean → 라벨, brennhub 채택 표). */
  readonly label: GangyakLabel;
  /** 3단 단순 분류. */
  readonly category: GangyakCategory;
  /** 검증·표시용 raw 메타. */
  readonly raw: GangyakRaw;
}

// ───────────────── 보조 ─────────────────

const OHAENG_GENERATES_LOCAL: Record<Ohaeng, Ohaeng> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

/** 일간 도움(비겁=같음 또는 인성=상대가 일간을 생함) 여부. */
function isSupportingOhaeng(dayOh: Ohaeng, otherOh: Ohaeng): boolean {
  if (dayOh === otherOh) return true; // 비겁
  if (OHAENG_GENERATES_LOCAL[otherOh] === dayOh) return true; // 인성 (other→day 생)
  return false;
}

/** 지지의 본기 천간 추출. */
function getMainStem(pillar: Pillar): Cheongan {
  const entries = JIJANG_TABLE[pillar.ji];
  const main = entries.find((e) => e.type === "본기") ?? entries[entries.length - 1];
  return main.stem;
}

// ───────────────── 3원소 판정 ─────────────────

/** 득령: 월지 본기 오행이 일간 비겁/인성인지. */
export function evaluateDeuglyeong(
  dayStem: Cheongan,
  monthPillar: Pillar,
): { deuglyeong: boolean; monthMainStem: Cheongan; monthMainOhaeng: Ohaeng } {
  const dayOh = CHEONGAN_OHAENG[dayStem];
  const monthMainStem = getMainStem(monthPillar);
  const monthMainOhaeng = CHEONGAN_OHAENG[monthMainStem];
  return {
    deuglyeong: isSupportingOhaeng(dayOh, monthMainOhaeng),
    monthMainStem,
    monthMainOhaeng,
  };
}

/** 득지: 일지 지장간(여/중/본기 모두) 중 일간 비겁/인성 천간이 하나라도 존재. */
export function evaluateDeukji(
  dayStem: Cheongan,
  dayPillar: Pillar,
): {
  deukji: boolean;
  dayJijang: ReadonlyArray<{ stem: Cheongan; ohaeng: Ohaeng; days: number }>;
} {
  const dayOh = CHEONGAN_OHAENG[dayStem];
  const dayJijang = JIJANG_TABLE[dayPillar.ji].map((e) => ({
    stem: e.stem,
    ohaeng: CHEONGAN_OHAENG[e.stem],
    days: e.days,
  }));
  const deukji = dayJijang.some((e) => isSupportingOhaeng(dayOh, e.ohaeng));
  return { deukji, dayJijang };
}

/**
 * 득세: 월지·일지 외 자리에서 (비겁+인성) > (식상+재성+관성).
 *
 * 자리 = 연지(+지장간) + 시지(+지장간) + 일간 외 천간 3개.
 * groupCount는 sipsin.ts의 일수 비례 카운트 모델 그대로 사용 (천간 1점 + 지장간 일수/30).
 */
export function evaluateDeukse(
  dayStem: Cheongan,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar },
): { deukse: boolean; supportCount: number; drainCount: number } {
  let support = 0;
  let drain = 0;
  const accumulate = (stem: Cheongan, weight: number): void => {
    const sp = getSipsin(dayStem, stem);
    const g = getSipsinGroup(sp);
    if (g === "비겁" || g === "인성") support += weight;
    else drain += weight;
  };

  // 일간 외 천간 3개 (월·일·시. 일간(day.gan)은 제외).
  accumulate(pillars.year.gan, 1);
  accumulate(pillars.month.gan, 1);
  if (pillars.hour) accumulate(pillars.hour.gan, 1);

  // 월·일지 외 지지 = 연지 + 시지 (+ 각각의 지장간).
  const otherJiji: Pillar[] = [pillars.year];
  if (pillars.hour) otherJiji.push(pillars.hour);
  for (const p of otherJiji) {
    for (const e of JIJANG_TABLE[p.ji]) {
      accumulate(e.stem, e.days / 30);
    }
  }

  return { deukse: support > drain, supportCount: support, drainCount: drain };
}

// ───────────────── 8분류 + 3단 매핑 ─────────────────

/** 3 boolean → 8분류 라벨 (brennhub 채택 표). */
function mapLabel(deuglyeong: boolean, deukji: boolean, deukse: boolean): GangyakLabel {
  if (deuglyeong && deukji && deukse) return "최강";
  if (deuglyeong && deukji && !deukse) return "강";
  if (deuglyeong && !deukji && deukse) return "중강";
  if (deuglyeong && !deukji && !deukse) return "강변약";
  if (!deuglyeong && deukji && deukse) return "약변강";
  if (!deuglyeong && deukji && !deukse) return "약";
  if (!deuglyeong && !deukji && deukse) return "중약";
  return "최약";
}

/** 라벨 → 3단 단순 분류. */
function mapCategory(label: GangyakLabel): GangyakCategory {
  if (label === "최강" || label === "강" || label === "중강") return "신강";
  if (label === "강변약" || label === "약변강") return "중화";
  return "신약";
}

// ───────────────── 통합 ─────────────────

/**
 * 사주 + 일간 + 십신 결과 → 강약(SajuGangyak).
 *
 * @param dayStem 일간 천간.
 * @param pillars year/month/day [+ hour]. hour 없으면 3 pillar로 처리.
 * @param _sipsin (참고 — 본 모듈은 자체 계산. sipsin 결과와 정합 확인용으로 미래 검증에 사용 가능.)
 */
export function evaluateGangyak(
  dayStem: Cheongan,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar },
  _sipsin?: SajuSipsin,
): SajuGangyak {
  const ryeong = evaluateDeuglyeong(dayStem, pillars.month);
  const ji = evaluateDeukji(dayStem, pillars.day);
  const se = evaluateDeukse(dayStem, pillars);

  const label = mapLabel(ryeong.deuglyeong, ji.deukji, se.deukse);
  const category = mapCategory(label);

  return {
    deuglyeong: ryeong.deuglyeong,
    deukji: ji.deukji,
    deukse: se.deukse,
    label,
    category,
    raw: {
      monthMainStem: ryeong.monthMainStem,
      monthMainOhaeng: ryeong.monthMainOhaeng,
      dayJijang: ji.dayJijang,
      supportCount: se.supportCount,
      drainCount: se.drainCount,
    },
  };
}
