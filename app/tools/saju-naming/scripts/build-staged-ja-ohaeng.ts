/**
 * C-5-4 자원오행 — staged-ja-ohaeng.json 빌드.
 *
 * 목적: staged-unihan.json 9,460 한자에 brennhub AI 학파(ai-default) 214부수 자원오행
 *       매핑을 적용 → ja_ohaeng 산출. C-5-6(bulk INSERT)의 입력.
 *
 * 매핑: lib/radical-ohaeng.ts (학파 plug-in 구조, 기본 ai-default).
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-ja-ohaeng.ts
 *
 * 입력: scripts/data/staged-unihan.json (codepoint, radical, radical_number)
 * 출력: scripts/data/staged-ja-ohaeng.json (codepoint, character, radical_number, radical, ja_ohaeng)
 *       + 콘솔 검증 통계 (총 / 계산 / null / 5행 분포 / spot-check)
 */

import { getJaOhaeng, type Ohaeng } from "../lib/radical-ohaeng";
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

interface JaOhaengRow {
  codepoint: number;
  character: string;
  radical_number: number | null;
  radical: string | null;
  ja_ohaeng: Ohaeng | null;
}

const SPOT_CHECK = ["樂", "福", "浩", "拓", "美"];

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");

  const unihan = JSON.parse(
    readFileSync(join(dataDir, "staged-unihan.json"), "utf-8"),
  ) as UnihanRow[];
  console.log(`staged-unihan: ${unihan.length} row`);

  const rows: JaOhaengRow[] = unihan.map((u) => ({
    codepoint: u.codepoint,
    character: u.character,
    radical_number: u.radical_number,
    radical: u.radical,
    ja_ohaeng: getJaOhaeng(u.radical_number),
  }));

  const outputPath = join(dataDir, "staged-ja-ohaeng.json");
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
  const computed = rows.filter((r) => r.ja_ohaeng !== null).length;
  const nullJa = rows.filter((r) => r.ja_ohaeng === null).length;

  console.log(`\n검증:`);
  expect("총 row", total, 9460);
  expect("ja_ohaeng 계산 (실제 CJK)", computed, 9055);
  expect("ja_ohaeng null (비표준)", nullJa, 405);

  // 5행 분포
  const dist: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const r of rows) {
    if (r.ja_ohaeng) dist[r.ja_ohaeng] += 1;
  }
  const distStr = (["목", "화", "토", "금", "수"] as const)
    .map((o) => {
      const pct = ((dist[o] / computed) * 100).toFixed(1);
      return `${o} ${dist[o]}(${pct}%)`;
    })
    .join(" / ");
  console.log(`  [정보] 5행 분포: ${distStr}`);

  // spot-check 5건
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
        `부수 ${r.radical}(${r.radical_number}) → 자원오행 ${r.ja_ohaeng}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    `\n검증 통과 — staged-ja-ohaeng.json ${total.toLocaleString()} row 생성 완료.`,
  );
}

main();
