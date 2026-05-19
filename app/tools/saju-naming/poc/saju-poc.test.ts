/**
 * 사주 계산 검증 테스트.
 *
 * 실행: npx ts-node app/tools/saju-naming/poc/saju-poc.test.ts
 *
 * 검증 케이스: 1979년 5월 29일 오전 5시 양력
 * 기대값:
 *   year.label === '기미'
 *   month.label === '경오'
 *   day.label === '병신'
 *   hour.label === '신묘'
 *   lunarDate === { year: 1979, month: 5, day: 4, intercalation: false }
 */

import assert from "node:assert/strict";
import { calculateSaju } from "../lib/saju";

const result = calculateSaju(1979, 5, 29, 5, false);

const failures: string[] = [];

function check<T>(label: string, actual: T, expected: T) {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch {
    failures.push(
      `${label}: 기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)}`,
    );
  }
}

check("year.label", result.year.label, "기미");
check("month.label", result.month.label, "경오");
check("day.label", result.day.label, "병신");
check("hour.label", result.hour.label, "신묘");
check("lunarDate", result.lunarDate, {
  year: 1979,
  month: 5,
  day: 4,
  intercalation: false,
});

if (failures.length === 0) {
  console.log("✅ 검증 통과");
  console.log(
    `  ${result.year.label}년 ${result.month.label}월 ${result.day.label}일 ${result.hour.label}시`,
  );
  console.log(
    `  음력: ${result.lunarDate.year}-${result.lunarDate.month}-${result.lunarDate.day}${result.lunarDate.intercalation ? " (윤달)" : ""}`,
  );
  console.log("  오행:", result.ohaeng);
  console.log("  부족(≤1):", result.deficient);
  console.log("  과다(≥3):", result.excessive);
} else {
  console.error("❌ 검증 실패");
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\n전체 결과:");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
