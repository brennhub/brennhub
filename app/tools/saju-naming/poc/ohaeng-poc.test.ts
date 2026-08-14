/**
 * 단순 카운트 용신 (simpleCountYongsin) 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/ohaeng-poc.test.ts
 *
 * 외숙모 합성 balance { 목:1, 화:2, 토:2, 금:3, 수:0 }.
 * 기대: deficient=[수], excessive=[금], yongsin 수 포함 + 금 미포함 (기신 우선).
 *
 * B-3-c 격상 후: analyzeOhaeng는 강약/일간/월지/십신 등 필요. 본 PoC는
 * 단순 카운트 로직만 단독 검증 → simpleCountYongsin(yongsin.ts에서 export)
 * 직접 호출. analyzeOhaeng 통합 검증은 saju-poc.test.ts에서 수행.
 */

import { simpleCountYongsin } from "../lib/yongsin";
import type { OhaengBalance } from "../lib/saju";

const balance: OhaengBalance = { 목: 1, 화: 2, 토: 2, 금: 3, 수: 0 };
const result = simpleCountYongsin(balance);

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
