/**
 * C-5-8 inname_ok 정확화 PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/inname-ok-reconcile.poc.ts
 *
 * 검증:
 *   1. staged-inname-ok-reconcile.json count == codepoints.length == 405.
 *   2. 전 codepoint ≥ 0xA0000 (plane 10/15) — 유효 CJK 범위 밖.
 *   3. plane 분포 = plane10 377 / plane15 28.
 *   4. reconcile set == staged-unihan total_strokes=null set (C-5-3 비표준 405자).
 *   5. reconcile set == staged-hanja codepoint≥0xA0000 set.
 *   6. 시뮬레이션 — 006 UPDATE 후 inname_ok=1 = 9,460 − 405 = 9,055.
 *
 * 입력: scripts/data/{staged-hanja,staged-unihan,staged-inname-ok-reconcile}.json
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
  "data",
);
const load = (f: string): unknown =>
  JSON.parse(readFileSync(join(dataDir, f), "utf-8"));

interface HanjaRow {
  codepoint: number;
  inname_ok: number;
}
interface UnihanRow {
  codepoint: number;
  total_strokes: number | null;
}
interface ReconcileEntry {
  codepoint: number;
  plane: number;
}
interface ReconcileFile {
  count: number;
  planeBreakdown: { plane10: number; plane15: number };
  codepoints: ReconcileEntry[];
}

const hanja = load("staged-hanja.json") as HanjaRow[];
const unihan = load("staged-unihan.json") as UnihanRow[];
const reconcile = load("staged-inname-ok-reconcile.json") as ReconcileFile;

const failures: string[] = [];
function check(label: string, cond: boolean): void {
  if (!cond) failures.push(label);
}

// 1. count 정합
check("count == 405", reconcile.count === 405);
check(
  "codepoints.length == count",
  reconcile.codepoints.length === reconcile.count,
);

// 2. 전 codepoint ≥ 0xA0000
check(
  "전 codepoint ≥ 0xA0000 (유효 CJK 범위 밖)",
  reconcile.codepoints.every((c) => c.codepoint >= 0xa0000),
);

// 3. plane 분포
check(
  "plane 분포 377/28",
  reconcile.planeBreakdown.plane10 === 377 &&
    reconcile.planeBreakdown.plane15 === 28,
);
check(
  "전 codepoint plane 10 또는 15",
  reconcile.codepoints.every((c) => c.plane === 10 || c.plane === 15),
);

// 4. reconcile set == staged-unihan total_strokes=null set
const reconcileCp = new Set(reconcile.codepoints.map((c) => c.codepoint));
const unihanNull = new Set(
  unihan.filter((u) => u.total_strokes == null).map((u) => u.codepoint),
);
check(
  "reconcile set == unihan total_strokes=null set",
  reconcileCp.size === unihanNull.size &&
    [...reconcileCp].every((c) => unihanNull.has(c)),
);

// 5. reconcile set == staged-hanja codepoint≥0xA0000 set
const hanjaNonstd = new Set(
  hanja.filter((h) => h.codepoint >= 0xa0000).map((h) => h.codepoint),
);
check(
  "reconcile set == staged-hanja codepoint≥0xA0000 set",
  reconcileCp.size === hanjaNonstd.size &&
    [...reconcileCp].every((c) => hanjaNonstd.has(c)),
);

// 6. 006 UPDATE 시뮬레이션 — inname_ok=1 = 9,460 − 405
const before = hanja.filter((h) => h.inname_ok === 1).length;
const after = hanja.filter(
  (h) => h.inname_ok === 1 && !reconcileCp.has(h.codepoint),
).length;
check("적용 전 inname_ok=1 == 9,460", before === 9460);
check("적용 후 inname_ok=1 == 9,055", after === 9055);

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — inname_ok reconcile 405자 (plane10 377/plane15 28) · ` +
    `unihan-null·codepoint 교차검증 일치 · 006 후 inname_ok=1 9,460→9,055.`,
);
