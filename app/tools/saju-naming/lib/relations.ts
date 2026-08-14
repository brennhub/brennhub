/**
 * 합충형파해 (合沖刑破害) — 단일 명식(8글자) 내 또는 두 명식 간 관계 감지.
 *
 * 명리학 사주 분석의 핵심 관계 분류:
 *   - 합: 천간합 5 / 지지 육합 6 / 삼합 4국 / 방합 4국
 *   - 충: 6충
 *   - 형: 삼형(인사신·축술미) / 자형(진오유해) / 상형(자묘)
 *   - 파: 6파
 *   - 해: 6해
 *   - 원진: 6원진
 *
 * 본 모듈은 **P1: 감지 + 표시만**. 합화 오행 변동·충 약화 등 명식 영향 반영은
 * 학파 룰 명세화 후 별도 task. 추천 영향 0.
 *
 * 일반화 API: `detectRelations(stems, branches)` — N개 천간 + N개 지지 입력에서
 * 모든 관계 감지. 단일 명식(N=4) 외에도 택일(D)·억부 통근(B-3)에서 재사용 가능
 * (예: 사주 4 pillar + 대상일 1 pillar = N=5 입력으로 동일 함수 호출).
 *
 * 출처:
 *   - 표: ko.wikipedia "합 (사주팔자)" (CC BY-SA 4.0) verbatim
 *     URL: https://ko.wikipedia.org/wiki/합_(사주팔자) (취득 2026-06-04).
 *   - sajustudy 표 cross-ref (https://www.sajustudy.com/).
 *   - 나무위키(CC BY-NC-SA 비상업)는 미사용.
 *
 * 학파 차이:
 *   - 육합 오미: 화 단독 채택. 화·토 두 학파 변형은 backlog plug-in.
 *   - 형 분류: 인사신·축술미 묶음 채택. 인사·사신 등 분리 학파는 backlog.
 *   - 파: 일부 학파는 파 자체 미사용 — backlog "파 활성/비활성" 옵션.
 *   - 원진: 짝짓기 미세 차이 가능 — 본 표 verbatim 채택.
 *
 * 본 task 미포함 (backlog):
 *   - 반합(2자, 왕지 포함) — 택일(D) 진입 시 추가.
 *   - 합화 오행 변동·충 약화(P2-P4) — 학파 룰 명세화 후.
 *   - UI 표시 (saju-result.tsx 합충 섹션) — 별도 task.
 */

import type { Cheongan, Jiji, Ohaeng } from "./saju";

// ───────────────── 타입 ─────────────────

export type PillarPosition = "year" | "month" | "day" | "hour" | string;

export type RelationKind =
  | "천간합"
  | "지지육합"
  | "삼합"
  | "방합"
  | "충"
  | "삼형"
  | "자형"
  | "상형"
  | "파"
  | "해"
  | "원진";

export interface RelationEntry {
  /** 관계 종류. */
  kind: RelationKind;
  /** 관계가 발견된 글자 (천간 또는 지지). 2~3개. */
  members: ReadonlyArray<Cheongan | Jiji>;
  /** 발견된 기둥 위치. members와 동일 길이. */
  positions: ReadonlyArray<PillarPosition>;
  /** 화합 오행 (천간합·육합·삼합·방합만). */
  resultOhaeng?: Ohaeng;
}

export interface SajuRelations {
  ganHap: RelationEntry[];
  jiHap: RelationEntry[];
  samhap: RelationEntry[];
  banghap: RelationEntry[];
  chung: RelationEntry[];
  hyung: RelationEntry[];
  pa: RelationEntry[];
  hae: RelationEntry[];
  wonjin: RelationEntry[];
}

export interface StemPosition {
  gan: Cheongan;
  position: PillarPosition;
}

export interface BranchPosition {
  ji: Jiji;
  position: PillarPosition;
}

// ───────────────── 합충 표 (위키 verbatim) ─────────────────

/** 천간합 5 — 학파 일치. */
const GAN_HAP_PAIRS: ReadonlyArray<readonly [Cheongan, Cheongan, Ohaeng]> = [
  ["갑", "기", "토"],
  ["을", "경", "금"],
  ["병", "신", "수"],
  ["정", "임", "목"],
  ["무", "계", "화"],
];

/** 지지 육합 6 — 오미는 화 단독 채택 (위키 verbatim, 화·토 변형 backlog). */
const JI_HAP_PAIRS: ReadonlyArray<readonly [Jiji, Jiji, Ohaeng]> = [
  ["자", "축", "토"],
  ["인", "해", "목"],
  ["묘", "술", "화"],
  ["진", "유", "금"],
  ["사", "신", "수"],
  ["오", "미", "화"],
];

/** 삼합 4국 (완전 3자). 반합(2자, 왕지 포함)은 backlog. */
const SAMHAP_TRIPLES: ReadonlyArray<readonly [Jiji, Jiji, Jiji, Ohaeng]> = [
  ["신", "자", "진", "수"],
  ["해", "묘", "미", "목"],
  ["인", "오", "술", "화"],
  ["사", "유", "축", "금"],
];

/** 방합 4국. */
const BANGHAP_TRIPLES: ReadonlyArray<readonly [Jiji, Jiji, Jiji, Ohaeng]> = [
  ["인", "묘", "진", "목"],
  ["사", "오", "미", "화"],
  ["신", "유", "술", "금"],
  ["해", "자", "축", "수"],
];

/** 6충. */
const CHUNG_PAIRS: ReadonlyArray<readonly [Jiji, Jiji]> = [
  ["자", "오"],
  ["축", "미"],
  ["인", "신"],
  ["묘", "유"],
  ["진", "술"],
  ["사", "해"],
];

/** 삼형 (지세지형·무은지형). */
const SAMHYUNG_TRIPLES: ReadonlyArray<readonly [Jiji, Jiji, Jiji]> = [
  ["인", "사", "신"],
  ["축", "술", "미"],
];

/** 상형 (자묘 무례지형). */
const SANGHYUNG_PAIRS: ReadonlyArray<readonly [Jiji, Jiji]> = [["자", "묘"]];

/** 자형 (동일 글자 2개 이상). */
const JAHYUNG: ReadonlySet<Jiji> = new Set<Jiji>(["진", "오", "유", "해"]);

/** 6파. (일부 학파 미사용 — backlog 활성/비활성 옵션.) */
const PA_PAIRS: ReadonlyArray<readonly [Jiji, Jiji]> = [
  ["자", "유"],
  ["묘", "오"],
  ["인", "해"],
  ["진", "축"],
  ["사", "신"],
  ["술", "미"],
];

/** 6해. */
const HAE_PAIRS: ReadonlyArray<readonly [Jiji, Jiji]> = [
  ["자", "미"],
  ["축", "오"],
  ["인", "사"],
  ["묘", "진"],
  ["신", "해"],
  ["유", "술"],
];

/** 6원진. */
const WONJIN_PAIRS: ReadonlyArray<readonly [Jiji, Jiji]> = [
  ["자", "미"],
  ["축", "오"],
  ["인", "유"],
  ["묘", "신"],
  ["진", "해"],
  ["사", "술"],
];

// ───────────────── 감지 함수 ─────────────────

/**
 * N개 천간 + N개 지지 입력에서 합충형파해 모든 관계 감지.
 *
 * 단일 명식 4 pillar = 4 stems + 4 branches. 택일(D) 사주+대상일 = N>4 입력 동일 함수.
 *
 * 페어 검사 (천간합·육합·충·파·해·원진·상형): 모든 (i,j) i<j 페어.
 * 자형: 동일 글자 ≥2회 출현 (진·오·유·해만).
 * 트리오 검사 (삼합·방합·삼형): unique set 기반 (중복 자 dedup).
 */
export function detectRelations(
  stems: ReadonlyArray<StemPosition>,
  branches: ReadonlyArray<BranchPosition>,
): SajuRelations {
  const r: SajuRelations = {
    ganHap: [],
    jiHap: [],
    samhap: [],
    banghap: [],
    chung: [],
    hyung: [],
    pa: [],
    hae: [],
    wonjin: [],
  };

  // 천간합 페어
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i].gan;
      const b = stems[j].gan;
      for (const [g1, g2, oh] of GAN_HAP_PAIRS) {
        if ((a === g1 && b === g2) || (a === g2 && b === g1)) {
          r.ganHap.push({
            kind: "천간합",
            members: [a, b],
            positions: [stems[i].position, stems[j].position],
            resultOhaeng: oh,
          });
          break;
        }
      }
    }
  }

  // 지지 페어 (육합·충·파·해·원진·상형)
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i].ji;
      const b = branches[j].ji;
      const posA = branches[i].position;
      const posB = branches[j].position;
      // 육합
      for (const [j1, j2, oh] of JI_HAP_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.jiHap.push({
            kind: "지지육합",
            members: [a, b],
            positions: [posA, posB],
            resultOhaeng: oh,
          });
          break;
        }
      }
      // 충
      for (const [j1, j2] of CHUNG_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.chung.push({ kind: "충", members: [a, b], positions: [posA, posB] });
          break;
        }
      }
      // 파
      for (const [j1, j2] of PA_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.pa.push({ kind: "파", members: [a, b], positions: [posA, posB] });
          break;
        }
      }
      // 해
      for (const [j1, j2] of HAE_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.hae.push({ kind: "해", members: [a, b], positions: [posA, posB] });
          break;
        }
      }
      // 원진
      for (const [j1, j2] of WONJIN_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.wonjin.push({ kind: "원진", members: [a, b], positions: [posA, posB] });
          break;
        }
      }
      // 상형
      for (const [j1, j2] of SANGHYUNG_PAIRS) {
        if ((a === j1 && b === j2) || (a === j2 && b === j1)) {
          r.hyung.push({ kind: "상형", members: [a, b], positions: [posA, posB] });
          break;
        }
      }
    }
  }

  // 자형 (동일 글자 ≥2)
  const jiCounts = new Map<Jiji, BranchPosition[]>();
  for (const bp of branches) {
    const arr = jiCounts.get(bp.ji) ?? [];
    arr.push(bp);
    jiCounts.set(bp.ji, arr);
  }
  for (const ji of JAHYUNG) {
    const arr = jiCounts.get(ji);
    if (arr && arr.length >= 2) {
      r.hyung.push({
        kind: "자형",
        members: arr.map(() => ji),
        positions: arr.map((b) => b.position),
      });
    }
  }

  // 트리오 (삼합·방합·삼형): unique set 기반 — 중복 자 dedup.
  const uniqueJi = new Set<Jiji>(branches.map((b) => b.ji));
  const findPos = (target: Jiji): PillarPosition =>
    (branches.find((b) => b.ji === target) as BranchPosition).position;

  for (const [j1, j2, j3, oh] of SAMHAP_TRIPLES) {
    if (uniqueJi.has(j1) && uniqueJi.has(j2) && uniqueJi.has(j3)) {
      r.samhap.push({
        kind: "삼합",
        members: [j1, j2, j3],
        positions: [findPos(j1), findPos(j2), findPos(j3)],
        resultOhaeng: oh,
      });
    }
  }
  for (const [j1, j2, j3, oh] of BANGHAP_TRIPLES) {
    if (uniqueJi.has(j1) && uniqueJi.has(j2) && uniqueJi.has(j3)) {
      r.banghap.push({
        kind: "방합",
        members: [j1, j2, j3],
        positions: [findPos(j1), findPos(j2), findPos(j3)],
        resultOhaeng: oh,
      });
    }
  }
  for (const [j1, j2, j3] of SAMHYUNG_TRIPLES) {
    if (uniqueJi.has(j1) && uniqueJi.has(j2) && uniqueJi.has(j3)) {
      r.hyung.push({
        kind: "삼형",
        members: [j1, j2, j3],
        positions: [findPos(j1), findPos(j2), findPos(j3)],
      });
    }
  }

  return r;
}
