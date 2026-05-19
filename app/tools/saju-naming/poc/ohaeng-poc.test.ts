/**
 * 오행 분석 (analyzeOhaeng) 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/ohaeng-poc.test.ts
 *
 * 외숙모 사주 케이스: 기미년 경오월 병신일 신묘시 → balance { 목:1, 화:2, 토:2, 금:3, 수:0 }.
 * 기대: deficient=[수], excessive=[금], yongsin 수 포함 + 금 미포함 (기신 우선).
 *
 * 이전엔 lib/ohaeng.ts 안에 inline으로 있었지만 Edge runtime 빌드 시
 * process.exit 호출이 번들에 끌려와 실패 → 별도 PoC test 파일로 분리.
 */

import { analyzeOhaeng } from "../lib/ohaeng";
import type { OhaengBalance } from "../lib/saju";

const balance: OhaengBalance = { 목: 1, 화: 2, 토: 2, 금: 3, 수: 0 };
const result = analyzeOhaeng(balance);

const failures: string[] = [];
function check<T>(label: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures.push(
      `${label}: 기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)}`,
    );
  }
}

check("deficient", result.deficient, ["수"]);
check("excessive", result.excessive, ["금"]);

if (!result.yongsin.includes("수")) {
  failures.push("yongsin에 '수' 미포함 (기대: 포함)");
}
if (result.yongsin.includes("금")) {
  failures.push("yongsin에 '금' 포함 (기대: 미포함)");
}

console.log("balance:", balance);
console.log("deficient:", result.deficient);
console.log("excessive:", result.excessive);
console.log("yongsin:", result.yongsin);
console.log("gisin:", result.gisin);
console.log("nameDirection:", result.nameDirection);

if (failures.length === 0) {
  console.log("\n✅ 검증 통과");
} else {
  console.error("\n❌ 검증 실패");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
