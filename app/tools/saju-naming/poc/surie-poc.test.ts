/**
 * 81수리 (calculateSurie) 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/surie-poc.test.ts
 *
 * 예시: 林(8) + 明(8) + 浩(11) — 기대 4격: 원격 8(길), 형격 16(길),
 * 이격 19(흉), 정격 27(반길). 총점 50/100.
 *
 * 이전엔 lib/surie.ts 안에 inline으로 있었지만 Edge runtime 빌드 시
 * process.exit 호출이 번들에 끌려와 실패 위험 → 별도 PoC test 파일로 분리.
 */

import { calculateSurie } from "../lib/surie";

const result = calculateSurie(8, 8, 11);

console.log("입력: 성씨 林(8) + 이름 明(8) 浩(11)");
console.log("");
console.log(
  `원격   ${result.wongyeok}  → ${result.scores.wongyeok.grade}  (${result.scores.wongyeok.desc})`,
);
console.log(
  `형격   ${result.hyeongyeok}  → ${result.scores.hyeongyeok.grade}  (${result.scores.hyeongyeok.desc})`,
);
console.log(
  `이격   ${result.igyeok} → ${result.scores.igyeok.grade}  (${result.scores.igyeok.desc})`,
);
console.log(
  `정격   ${result.jeongyeok} → ${result.scores.jeongyeok.grade} (${result.scores.jeongyeok.desc})`,
);
console.log("");
console.log(`총점: ${result.totalScore}/100`);

const failures: string[] = [];
function check<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    failures.push(`${label}: 기대 ${expected}, 실제 ${actual}`);
  }
}
check("원격 num", result.wongyeok, 8);
check("원격 grade", result.scores.wongyeok.grade, "길");
check("형격 num", result.hyeongyeok, 16);
check("형격 grade", result.scores.hyeongyeok.grade, "길");
check("이격 num", result.igyeok, 19);
check("이격 grade", result.scores.igyeok.grade, "흉");
check("정격 num", result.jeongyeok, 27);
check("정격 grade", result.scores.jeongyeok.grade, "반길");

if (failures.length === 0) {
  console.log("\n✅ 검증 통과");
} else {
  console.error("\n❌ 검증 실패");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
