/**
 * 이름 추천 (recommendNames) 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/names-poc.test.ts
 *
 * 외숙모 사주 케이스 (yongsin=[수], gisin=[금]) + 시드 25자 풀로 Top 3 출력.
 *
 * 이전엔 lib/names.ts 안에 inline으로 있었지만 Edge runtime 빌드 시
 * 번들에 끌려와 실패 위험 → 별도 PoC test 파일로 분리.
 */

import { recommendNames, type HanjaEntry } from "../lib/names";

// 시드 25자 (migrations/002_hanja_seed.sql 와 동일)
const seed: HanjaEntry[] = [
  { character: "林", hangeul: "림", stroke: 8, ohaeng: "목", meaning: "수풀", frequency: 5 },
  { character: "森", hangeul: "삼", stroke: 12, ohaeng: "목", meaning: "빽빽할/숲", frequency: 4 },
  { character: "樹", hangeul: "수", stroke: 16, ohaeng: "목", meaning: "나무", frequency: 4 },
  { character: "棟", hangeul: "동", stroke: 12, ohaeng: "목", meaning: "마룻대", frequency: 3 },
  { character: "春", hangeul: "춘", stroke: 9, ohaeng: "목", meaning: "봄", frequency: 5 },
  { character: "明", hangeul: "명", stroke: 8, ohaeng: "화", meaning: "밝을", frequency: 5 },
  { character: "炳", hangeul: "병", stroke: 9, ohaeng: "화", meaning: "불꽃/밝을", frequency: 4 },
  { character: "燁", hangeul: "엽", stroke: 16, ohaeng: "화", meaning: "빛날", frequency: 3 },
  { character: "煥", hangeul: "환", stroke: 13, ohaeng: "화", meaning: "빛날", frequency: 4 },
  { character: "熙", hangeul: "희", stroke: 13, ohaeng: "화", meaning: "빛날/기뻐할", frequency: 5 },
  { character: "美", hangeul: "미", stroke: 9, ohaeng: "토", meaning: "아름다울", frequency: 5 },
  { character: "地", hangeul: "지", stroke: 6, ohaeng: "토", meaning: "땅", frequency: 3 },
  { character: "城", hangeul: "성", stroke: 10, ohaeng: "토", meaning: "성/재", frequency: 4 },
  { character: "培", hangeul: "배", stroke: 11, ohaeng: "토", meaning: "북돋울", frequency: 4 },
  { character: "基", hangeul: "기", stroke: 11, ohaeng: "토", meaning: "터", frequency: 4 },
  { character: "鎭", hangeul: "진", stroke: 18, ohaeng: "금", meaning: "진압할", frequency: 4 },
  { character: "銀", hangeul: "은", stroke: 14, ohaeng: "금", meaning: "은", frequency: 4 },
  { character: "鉉", hangeul: "현", stroke: 13, ohaeng: "금", meaning: "솥귀", frequency: 4 },
  { character: "錦", hangeul: "금", stroke: 16, ohaeng: "금", meaning: "비단", frequency: 4 },
  { character: "鈞", hangeul: "균", stroke: 12, ohaeng: "금", meaning: "서른 근/공평", frequency: 3 },
  { character: "浩", hangeul: "호", stroke: 11, ohaeng: "수", meaning: "넓을", frequency: 5 },
  { character: "海", hangeul: "해", stroke: 11, ohaeng: "수", meaning: "바다", frequency: 5 },
  { character: "江", hangeul: "강", stroke: 7, ohaeng: "수", meaning: "강", frequency: 4 },
  { character: "泉", hangeul: "천", stroke: 9, ohaeng: "수", meaning: "샘", frequency: 4 },
  { character: "潤", hangeul: "윤", stroke: 16, ohaeng: "수", meaning: "윤택할", frequency: 5 },
];

const result = recommendNames({
  sungHanja: "林",
  sungStroke: 8,
  yongsin: ["수"],
  gisin: ["금"],
  nameLength: 2,
  topN: 3,
  db: seed,
});

console.log("입력: 성씨 林(8) / 용신=[수] / 기신=[금] / nameLength=2 / topN=3");
console.log("");
for (let i = 0; i < result.length; i++) {
  const c = result[i];
  console.log(
    `${i + 1}. ${c.hanja} (${c.hangeul})  획수[${c.strokes.join(",")}]  오행[${c.ohaengList.join(
      ",",
    )}]  발음[${c.soundOhaengList.join(",")}]`,
  );
  console.log(
    `   ohaeng=${c.ohaengScore}  surie=${c.surieScore}  sound=${c.soundScore}  → ${c.breakdown}`,
  );
}
