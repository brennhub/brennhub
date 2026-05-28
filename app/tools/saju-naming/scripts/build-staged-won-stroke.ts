/**
 * C-5-5 원획법 코드화 — staged-won-stroke.json 빌드.
 *
 * 목적: staged-unihan.json 9,460 한자에 원획법(C-4-B)을 적용해 won_stroke 산출.
 *       C-5-6(bulk INSERT 마이그레이션)의 입력.
 *
 * 원획법 룰: lib/won-stroke.ts (C-4-B 14부수 환원표 + 숫자 한자 13자).
 *   공식 won_stroke = additional_strokes + 원획[radical_number] (14부수 한정) / 그 외 total_strokes.
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-won-stroke.ts
 *
 * 입력: scripts/data/staged-unihan.json
 * 출력: scripts/data/staged-won-stroke.json + 콘솔 검증 통계
 */

import {
  calculateWonStroke,
  NUMERIC_HANJA,
  RADICAL_WON_STROKE,
} from "../lib/won-stroke";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface UnihanRow {
  codepoint: number;
  character: string;
  radical: string | null;
  radical_number: number | null;
  additional_strokes: number | null;
  total_strokes: number | null;
  meaning_en: string | null;
}

interface WonStrokeRow {
  codepoint: number;
  character: string;
  total_strokes: number | null;
  won_stroke: number | null;
  restoration_diff: number | null;
}

const SPOT_CHECK = ["浩", "草", "拓", "樂", "美"];

// 14 환원표 부수 라벨 (콘솔 통계용)
const RADICAL_LABEL: Record<number, string> = {
  61: "忄/心",
  85: "氵/水",
  64: "扌/手",
  94: "犭/犬",
  96: "王/玉",
  113: "礻/示",
  130: "月/肉",
  125: "耂/老",
  145: "衤/衣",
  140: "艹/艸",
  122: "罒/网",
  162: "辶/辵",
  170: "阝/阜",
  163: "阝/邑",
};

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");

  const unihan = JSON.parse(
    readFileSync(join(dataDir, "staged-unihan.json"), "utf-8"),
  ) as UnihanRow[];
  console.log(`staged-unihan: ${unihan.length} row`);

  const rows: WonStrokeRow[] = unihan.map((u) => {
    const won = calculateWonStroke(
      u.character,
      u.total_strokes,
      u.additional_strokes,
      u.radical_number,
    );
    return {
      codepoint: u.codepoint,
      character: u.character,
      total_strokes: u.total_strokes,
      won_stroke: won,
      restoration_diff:
        won !== null && u.total_strokes !== null
          ? won - u.total_strokes
          : null,
    };
  });

  const outputPath = join(dataDir, "staged-won-stroke.json");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(rows, null, 2) + "\n", "utf-8");
  console.log(`\n출력: ${outputPath}`);

  // ── 검증 ───────────────────────────────────────────────
  const failures: string[] = [];
  function expect(label: string, actual: number, expected: number): void {
    const ok = Math.abs(actual - expected) <= 1;
    console.log(
      `  ${ok ? "[OK]  " : "[FAIL]"} ${label}: ${actual} (기대 ${expected}±1)`,
    );
    if (!ok) failures.push(`${label}: ${actual} ≠ ${expected}±1`);
  }

  const total = rows.length;
  const computed = rows.filter((r) => r.won_stroke !== null).length;
  const nullWon = rows.filter((r) => r.won_stroke === null).length;

  console.log(`\n검증:`);
  expect("총 row", total, 9460);
  expect("won_stroke 계산 (실제 CJK)", computed, 9055);
  expect("won_stroke null (비표준)", nullWon, 405);

  // 환원 적용 통계 — 14부수별 won≠total 한자 수
  const restoreByRadical = new Map<number, number>();
  for (let i = 0; i < unihan.length; i++) {
    const rn = unihan[i].radical_number;
    if (rn === null || RADICAL_WON_STROKE[rn] === undefined) continue;
    const diff = rows[i].restoration_diff;
    if (diff !== null && diff !== 0) {
      restoreByRadical.set(rn, (restoreByRadical.get(rn) ?? 0) + 1);
    }
  }
  let restoredTotal = 0;
  const restoreParts: string[] = [];
  for (const rn of Object.keys(RADICAL_WON_STROKE).map(Number)) {
    const n = restoreByRadical.get(rn) ?? 0;
    restoredTotal += n;
    restoreParts.push(`${RADICAL_LABEL[rn]} ${n}`);
  }
  console.log(`  [정보] 환원 적용 ${restoredTotal}자 — ${restoreParts.join(" / ")}`);

  // 숫자 한자 13자 — won_stroke == 의미값
  console.log(`  [정보] 숫자 한자 13자:`);
  for (const [ch, expected] of Object.entries(NUMERIC_HANJA)) {
    const r = rows.find((x) => x.character === ch);
    if (!r) {
      failures.push(`숫자 한자 ${ch}: staged에 없음`);
      continue;
    }
    const ok = r.won_stroke === expected;
    if (!ok) failures.push(`숫자 한자 ${ch}: won ${r.won_stroke} ≠ ${expected}`);
    console.log(
      `    ${ok ? "[OK]" : "[FAIL]"} ${ch}: won ${r.won_stroke} (표면 ${r.total_strokes} → 의미값 ${expected})`,
    );
  }

  // spot-check 5건 verbatim
  console.log(`\nspot-check:`);
  for (const ch of SPOT_CHECK) {
    const r = rows.find((x) => x.character === ch);
    if (!r) {
      console.log(`  [FAIL] ${ch}: staged에 없음`);
      failures.push(`spot-check: ${ch} 누락`);
      continue;
    }
    console.log(
      `  ${ch} U+${r.codepoint.toString(16).toUpperCase()}: ` +
        `표면 ${r.total_strokes} → 원획 ${r.won_stroke} (diff ${r.restoration_diff})`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    `\n검증 통과 — staged-won-stroke.json ${total.toLocaleString()} row 생성 완료.`,
  );
}

main();
