/**
 * 이름 추천 (recommendNames) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/names-poc.test.ts
 *
 * 검증 (C-5-7c 반영):
 *   - 시드 25자 풀 / 사주 case 3건 (n=2, n=1, yongsin 빈 배열).
 *   - 정렬(totalScore desc) / topN 상한 / 81수리 won_stroke 기준 / no-throw.
 *   - case4: bounded top-N 정확성 (축소 topN == 전체 정렬 상위 N 점수 동일).
 *   - case5: 대형 풀(500자) n=2 스트레스 — Workers 메모리 OOM 회귀 가드.
 *
 * Edge runtime 호환을 위해 lib/names.ts에서 분리 (CHANGELOG 0.4.1).
 */

import { recommendNames, type HanjaEntry } from "../lib/names";

// 시드 25자 — stroke=필획, won_stroke=원획 (氵 변형부수 한자는 환원 +1).
const seed: HanjaEntry[] = [
  { character: "林", hangeul: "림", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "수풀", frequency: 5 },
  { character: "森", hangeul: "삼", stroke: 12, won_stroke: 12, ohaeng: "목", meaning: "빽빽할/숲", frequency: 4 },
  { character: "樹", hangeul: "수", stroke: 16, won_stroke: 16, ohaeng: "목", meaning: "나무", frequency: 4 },
  { character: "棟", hangeul: "동", stroke: 12, won_stroke: 12, ohaeng: "목", meaning: "마룻대", frequency: 3 },
  { character: "春", hangeul: "춘", stroke: 9, won_stroke: 9, ohaeng: "목", meaning: "봄", frequency: 5 },
  { character: "明", hangeul: "명", stroke: 8, won_stroke: 8, ohaeng: "화", meaning: "밝을", frequency: 5 },
  { character: "炳", hangeul: "병", stroke: 9, won_stroke: 9, ohaeng: "화", meaning: "불꽃/밝을", frequency: 4 },
  { character: "燁", hangeul: "엽", stroke: 16, won_stroke: 16, ohaeng: "화", meaning: "빛날", frequency: 3 },
  { character: "煥", hangeul: "환", stroke: 13, won_stroke: 13, ohaeng: "화", meaning: "빛날", frequency: 4 },
  { character: "熙", hangeul: "희", stroke: 13, won_stroke: 13, ohaeng: "화", meaning: "빛날/기뻐할", frequency: 5 },
  { character: "美", hangeul: "미", stroke: 9, won_stroke: 9, ohaeng: "토", meaning: "아름다울", frequency: 5 },
  { character: "地", hangeul: "지", stroke: 6, won_stroke: 6, ohaeng: "토", meaning: "땅", frequency: 3 },
  { character: "城", hangeul: "성", stroke: 10, won_stroke: 10, ohaeng: "토", meaning: "성/재", frequency: 4 },
  { character: "培", hangeul: "배", stroke: 11, won_stroke: 11, ohaeng: "토", meaning: "북돋울", frequency: 4 },
  { character: "基", hangeul: "기", stroke: 11, won_stroke: 11, ohaeng: "토", meaning: "터", frequency: 4 },
  { character: "鎭", hangeul: "진", stroke: 18, won_stroke: 18, ohaeng: "금", meaning: "진압할", frequency: 4 },
  { character: "銀", hangeul: "은", stroke: 14, won_stroke: 14, ohaeng: "금", meaning: "은", frequency: 4 },
  { character: "鉉", hangeul: "현", stroke: 13, won_stroke: 13, ohaeng: "금", meaning: "솥귀", frequency: 4 },
  { character: "錦", hangeul: "금", stroke: 16, won_stroke: 16, ohaeng: "금", meaning: "비단", frequency: 4 },
  { character: "鈞", hangeul: "균", stroke: 12, won_stroke: 12, ohaeng: "금", meaning: "서른 근/공평", frequency: 3 },
  { character: "浩", hangeul: "호", stroke: 10, won_stroke: 11, ohaeng: "수", meaning: "넓을", frequency: 5 },
  { character: "海", hangeul: "해", stroke: 10, won_stroke: 11, ohaeng: "수", meaning: "바다", frequency: 5 },
  { character: "江", hangeul: "강", stroke: 6, won_stroke: 7, ohaeng: "수", meaning: "강", frequency: 4 },
  { character: "泉", hangeul: "천", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "샘", frequency: 4 },
  { character: "潤", hangeul: "윤", stroke: 15, won_stroke: 16, ohaeng: "수", meaning: "윤택할", frequency: 5 },
];

const failures: string[] = [];
function check(label: string, cond: boolean): void {
  if (!cond) failures.push(label);
}
function sortedDesc(xs: { totalScore: number }[]): boolean {
  return xs.every((c, i) => i === 0 || xs[i - 1].totalScore >= c.totalScore);
}

// case 1 — n=2, yongsin=[수] gisin=[금]
const r1 = recommendNames({
  sungHanja: "林",
  sungStroke: 8,
  yongsin: ["수"],
  gisin: ["금"],
  nameLength: 2,
  topN: 3,
  db: seed,
});
check("case1 topN ≤ 3", r1.length <= 3);
check("case1 정렬 desc", sortedDesc(r1));
check("case1 totalScore 유효", r1.every((c) => Number.isFinite(c.totalScore)));

// case 2 — n=1, 81수리 won_stroke 기준 검증.
//   浩: won_stroke 11 → calculateSurie(8,11) = 원8길+형19흉+이11길+정19흉 = 40.
//   (필획 10 사용 시 = 원8길+형18길+이10흉+정18길 = 60 → 회귀 감지.)
const r2 = recommendNames({
  sungHanja: "林",
  sungStroke: 8,
  yongsin: ["수"],
  gisin: ["금"],
  nameLength: 1,
  topN: 25,
  db: seed,
});
check("case2 정렬 desc", sortedDesc(r2));
const ho = r2.find((c) => c.hanja === "浩");
check("case2 浩 후보 존재", ho !== undefined);
check("case2 浩 surieScore=40 (won_stroke 11 기준)", ho?.surieScore === 40);

// case 3 — yongsin 빈 배열 (균형 사주 fallback) — no-throw + 정렬
const r3 = recommendNames({
  sungHanja: "林",
  sungStroke: 8,
  yongsin: [],
  gisin: [],
  nameLength: 1,
  topN: 5,
  db: seed,
});
check("case3 yongsin 빈 — no-throw + 정렬 + topN", sortedDesc(r3) && r3.length <= 5);

// case 4 — bounded top-N 정확성 (C-5-7c).
//   recommendNames는 exact top-N (근사 아님) → topN=3 결과 점수 = topN=full 결과 상위 3개 점수.
//   타이 시 동점 후보의 배열 순서는 다를 수 있어 totalScore 배열로만 비교.
const smallPool = seed.slice(0, 6); // n=2 → 6×5 = 30 조합
const c4opts = {
  sungHanja: "林",
  sungStroke: 8,
  yongsin: ["수"],
  gisin: ["금"],
  nameLength: 2 as const,
};
const r4full = recommendNames({ ...c4opts, topN: 30, db: smallPool });
const r4top3 = recommendNames({ ...c4opts, topN: 3, db: smallPool });
check("case4 전체 정렬 30개", r4full.length === 30);
check("case4 축소 3개", r4top3.length === 3);
check("case4 정렬 desc (full)", sortedDesc(r4full));
check(
  "case4 bounded == 전체 정렬 상위 3 (점수 동일)",
  r4top3.every((c, i) => c.totalScore === r4full[i].totalScore),
);

// case 5 — 대형 합성 풀 500자 n=2 스트레스 (약 25만 조합) — Workers 메모리 OOM 회귀 가드.
//   합성 한자: 점수 계산은 won_stroke/ohaeng/hangeul만 사용 → character는 placeholder.
const HANGEUL_POOL = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차"];
const OH = ["목", "화", "토", "금", "수"];
const bigPool: HanjaEntry[] = [];
for (let i = 0; i < 500; i++) {
  bigPool.push({
    character: `합성${i}`,
    hangeul: HANGEUL_POOL[i % HANGEUL_POOL.length],
    stroke: (i % 25) + 1,
    won_stroke: (i % 25) + 1,
    ohaeng: OH[i % OH.length],
    meaning: "합성",
    frequency: 3,
  });
}
const r5 = recommendNames({
  sungHanja: "林",
  sungStroke: 8,
  yongsin: ["수"],
  gisin: ["금"],
  nameLength: 2,
  topN: 30,
  db: bigPool,
});
check("case5 대형풀 결과 채움 (30)", r5.length === 30);
check("case5 대형풀 정렬 desc", sortedDesc(r5));
check(
  "case5 대형풀 totalScore 전부 유효",
  r5.every((c) => Number.isFinite(c.totalScore)),
);

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — recommendNames 5 case (n=2 / n=1 / yongsin 빈 / bounded 정확성 / 대형풀 500자) · 81수리 won_stroke 기준 · 정렬·topN.`,
);
