/**
 * 자원오행 매핑 (lib/radical-ohaeng.ts) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/radical-ohaeng.poc.ts
 *
 * 검증:
 *   1. ai-default 214 entries + 5행 각 ≥1.
 *   2. 자명 부수 spot — 木75목 / 火86화 / 土32토 / 金167금 / 水85수.
 *   3. 학파 plug-in 라우팅 sanity.
 *   4. lib ↔ learnings record (...c5-4-mapping.md) 214 전건 일관성.
 */

import {
  getJaOhaeng,
  RADICAL_OHAENG_AI_DEFAULT,
  type Ohaeng,
} from "../lib/radical-ohaeng";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const failures: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(
      `${label}: 기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)}`,
    );
  }
}

// 1. 214 entries + 5행 각 ≥1
check("214 entries", Object.keys(RADICAL_OHAENG_AI_DEFAULT).length, 214);
const dist: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
for (let n = 1; n <= 214; n++) dist[RADICAL_OHAENG_AI_DEFAULT[n]] += 1;
for (const o of ["목", "화", "토", "금", "수"] as const) {
  if (dist[o] < 1) failures.push(`5행 분포: ${o} 0개`);
}

// 2. 자명 부수 spot-check
check("木(75)", getJaOhaeng(75), "목");
check("火(86)", getJaOhaeng(86), "화");
check("土(32)", getJaOhaeng(32), "토");
check("金(167)", getJaOhaeng(167), "금");
check("水(85)", getJaOhaeng(85), "수");

// 3. 학파 plug-in 라우팅
check("plug-in 라우팅", getJaOhaeng(75, "ai-default"), getJaOhaeng(75));
check("plug-in == 테이블", getJaOhaeng(75), RADICAL_OHAENG_AI_DEFAULT[75]);
check("비표준 null", getJaOhaeng(null), null);

// 4. lib ↔ learnings record 214 전건 일관성
const scriptDir = dirname(fileURLToPath(import.meta.url));
const recordPath = join(
  scriptDir,
  "..",
  "..",
  "..",
  "..",
  "docs",
  "learnings",
  "2026-05-20-saju-naming-c5-4-mapping.md",
);
const record = readFileSync(recordPath, "utf-8");
const recordMap: Record<number, string> = {};
for (const line of record.split(/\r?\n/)) {
  const m = /^(\d{1,3}) (\S+) ([목화토금수])$/.exec(line);
  if (m) recordMap[Number(m[1])] = m[3];
}
check("record 214행 parse", Object.keys(recordMap).length, 214);
let mismatch = 0;
for (let n = 1; n <= 214; n++) {
  if (recordMap[n] !== RADICAL_OHAENG_AI_DEFAULT[n]) {
    mismatch += 1;
    if (mismatch <= 5) {
      failures.push(
        `lib↔record 부수${n}: record ${recordMap[n]} ≠ lib ${RADICAL_OHAENG_AI_DEFAULT[n]}`,
      );
    }
  }
}
check("lib ↔ record 일관성 (불일치 0)", mismatch, 0);

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — 214 entries / 5행 분포 / 자명 부수 5 / plug-in 라우팅 / lib↔record 214 일관.`,
);
