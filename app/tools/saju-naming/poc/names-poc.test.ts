/**
 * 이름 추천 (recommendNames) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/names-poc.test.ts
 *
 * 검증 (음령오행 2단계 반영):
 *   - 시드 25자 풀 / n=2·n=1.
 *   - case3: 음령오행 통합 — soundScore = evaluateSoundOhaeng(성+이름),
 *     breakdown "음령N+수리N=T", F3 제거(ohaengScore 없음).
 *   - 정렬(totalScore desc) / topN 상한 / 81수리 won_stroke 기준 / no-throw.
 *   - case4: bounded top-N 정확성. case5: 대형 풀 OOM 회귀 가드.
 *
 * Edge runtime 호환을 위해 lib/names.ts에서 분리 (CHANGELOG 0.4.1).
 */

import { recommendNames, type HanjaEntry } from "../lib/names";
import { evaluateSoundOhaeng } from "../lib/sound-ohaeng";

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

// 성씨 — 林(림). 음령 체인 시작점.
const SUNG = { sungHanja: "林", sungHangeul: "림", sungStroke: 8 };

// case 1 — n=2
const r1 = recommendNames({ ...SUNG, nameLength: 2, topN: 3, db: seed });
check("case1 topN ≤ 3", r1.length <= 3);
check("case1 정렬 desc", sortedDesc(r1));
check("case1 totalScore 유효", r1.every((c) => Number.isFinite(c.totalScore)));

// case 2 — n=1, 81수리 won_stroke 기준 검증 (surie 경로 불변).
//   浩: won_stroke 11 → calculateSurie(8,11) = 원8길+형19흉+이11길+정19흉 = 40.
const r2 = recommendNames({ ...SUNG, nameLength: 1, topN: 25, db: seed });
check("case2 정렬 desc", sortedDesc(r2));
const ho = r2.find((c) => c.hanja === "浩");
check("case2 浩 후보 존재", ho !== undefined);
check("case2 浩 surieScore=40 (won_stroke 11 기준)", ho?.surieScore === 40);

// case 3 — 음령오행 통합 검증
//   soundScore = evaluateSoundOhaeng([성씨한글, ...이름한글]) / breakdown 음령·수리 /
//   totalScore = round(음령×.55) + round(수리×.45) / F3 제거 (ohaengScore 없음).
const r3 = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: seed });
for (const c of r3) {
  const nameSyllables = [...c.hangeul]; // 이름 한글 글자별
  const expectedSound = evaluateSoundOhaeng([
    "림",
    ...nameSyllables,
  ]).score;
  check(
    `case3 ${c.hanja} soundScore = evaluateSoundOhaeng 체인`,
    c.soundScore === expectedSound,
  );
  const sw = Math.round(c.soundScore * 0.55);
  const rw = Math.round(c.surieScore * 0.45);
  check(`case3 ${c.hanja} totalScore = 음령+수리`, c.totalScore === sw + rw);
  check(
    `case3 ${c.hanja} breakdown 음령·수리 형식`,
    c.breakdown === `음령${sw}+수리${rw}=${c.totalScore}`,
  );
  check(
    `case3 ${c.hanja} F3 제거 (ohaengScore 없음)`,
    !("ohaengScore" in c),
  );
}

// case 4 — bounded top-N 정확성. exact top-N → topN=3 점수 = topN=full 상위 3.
const smallPool = seed.slice(0, 6); // n=2 → 6×5 = 30 조합
const r4full = recommendNames({
  ...SUNG,
  nameLength: 2,
  topN: 30,
  db: smallPool,
});
const r4top3 = recommendNames({
  ...SUNG,
  nameLength: 2,
  topN: 3,
  db: smallPool,
});
check("case4 전체 정렬 30개", r4full.length === 30);
check("case4 축소 3개", r4top3.length === 3);
check("case4 정렬 desc (full)", sortedDesc(r4full));
check(
  "case4 bounded == 전체 정렬 상위 3 (점수 동일)",
  r4top3.every((c, i) => c.totalScore === r4full[i].totalScore),
);

// case 5 — 대형 합성 풀 500자 n=2 스트레스 (약 25만 조합) — OOM 회귀 가드.
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
  ...SUNG,
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
  `PoC 통과 — recommendNames 5 case (n=2 / n=1 / 음령오행 통합 / bounded 정확성 / 대형풀 500자) · 음령 55%+수리 45% · F3 제거.`,
);
