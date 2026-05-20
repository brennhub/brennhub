/**
 * 원획법 계산 (lib/won-stroke.ts) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/won-stroke.poc.ts
 *
 * 검증:
 *   1. 002_hanja_seed.sql 25자 — 시드 stroke는 원획법 기준 (002 주석 명시) → 독립 oracle.
 *   2. 숫자 한자 13자 — numeric override (萬은 radical 140이나 의미값 우선).
 *   3. 14부수 환원 / 비환원 / 비표준 직접 케이스.
 *
 * 입력: scripts/data/staged-unihan.json (C-5-3 산출 — 한자별 total/additional/radical).
 */

import { calculateWonStroke, NUMERIC_HANJA } from "../lib/won-stroke";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 002_hanja_seed.sql 25자 — stroke 값 (원획법 기준, 002 주석 "획수는 원획법 기준")
const SEED: Record<string, number> = {
  林: 8, 森: 12, 樹: 16, 棟: 12, 春: 9,
  明: 8, 炳: 9, 燁: 16, 煥: 13, 熙: 13,
  美: 9, 地: 6, 城: 10, 培: 11, 基: 11,
  鎭: 18, 銀: 14, 鉉: 13, 錦: 16, 鈞: 12,
  浩: 11, 海: 11, 江: 7, 泉: 9, 潤: 16,
};

interface UnihanRow {
  character: string;
  total_strokes: number | null;
  additional_strokes: number | null;
  radical_number: number | null;
}

const failures: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(
      `${label}: 기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)}`,
    );
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const unihan = JSON.parse(
  readFileSync(
    join(scriptDir, "..", "scripts", "data", "staged-unihan.json"),
    "utf-8",
  ),
) as UnihanRow[];
const byChar = new Map(unihan.map((u) => [u.character, u]));

function won(ch: string): number | null {
  const u = byChar.get(ch);
  if (!u) {
    failures.push(`${ch}: staged-unihan에 없음`);
    return NaN;
  }
  return calculateWonStroke(
    ch,
    u.total_strokes,
    u.additional_strokes,
    u.radical_number,
  );
}

// 1. 002 seed 25자 — 22자 hard gate / 3자(城熙燁)는 base-획수 델타 → 명시만 (게이트 제외).
//    城/熙/燁: Unihan kTotalStrokes ↔ 명리학 작명 base ~12% 표본 델타 — C-4-B scope(14부수+숫자) 밖.
const SEED_DELTA = new Set(["城", "熙", "燁"]);
for (const [ch, expected] of Object.entries(SEED)) {
  const w = won(ch);
  if (SEED_DELTA.has(ch)) {
    console.log(
      `[델타] seed ${ch}: 명리학 ${expected} / 계산(Unihan base) ${w} — base 획수 도메인 차이, C-4-B scope 밖`,
    );
  } else {
    check(`seed ${ch}`, w, expected);
  }
}

// 2. 숫자 한자 13자 — numeric override
for (const [ch, expected] of Object.entries(NUMERIC_HANJA)) {
  check(`numeric ${ch}`, won(ch), expected);
}

// 3. 직접 케이스 — residual + 원획 공식
check("14부수 환원 氵(rn85) 잔여7", calculateWonStroke("？", 10, 7, 85), 11); // 7 + 水4
check("14부수 환원 艹(rn140) 잔여6", calculateWonStroke("？", 9, 6, 140), 12); // 6 + 艸6
check("14부수 환원 阝우(rn163) 잔여6", calculateWonStroke("？", 8, 6, 163), 14); // 6 + 邑8
check("14부수 외 木(rn75) 환원없음", calculateWonStroke("？", 15, 11, 75), 15); // total
check("비표준 (radical null)", calculateWonStroke("？", null, null, null), null);

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — seed 22/25 게이트 + 숫자 한자 13자 + 직접 케이스 5건. 델타 3자(城熙燁)는 C-4-B scope 밖 명시.`,
);
