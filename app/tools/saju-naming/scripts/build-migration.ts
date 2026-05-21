/**
 * C-5-6 5-way join + bulk INSERT migration 생성.
 *
 * 목적: staged 4종 + 음령오행 계산을 codepoint 기준 join → hanja 9,460 row
 *       bulk INSERT (migrations/005_hanja_seed_full.sql) 생성.
 *
 * 5-way:
 *   staged-hanja (base — character/codepoint/hangeul/meaning/inname_ok)
 *   + staged-unihan    (radical / stroke=total_strokes / meaning_en)
 *   + staged-won-stroke (won_stroke)
 *   + staged-ja-ohaeng  (ja_ohaeng)
 *   + 음령오행 — lib/names.ts getSoundOhaeng 재사용 (신규 lib X, 기존 패턴 재사용).
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-migration.ts
 * 입력: scripts/data/staged-{hanja,unihan,won-stroke,ja-ohaeng}.json
 * 출력: migrations/005_hanja_seed_full.sql (배치 ~500 row/INSERT) + 콘솔 검증 통계.
 *
 * 적재 전 004_hanja_rebuild.sql 선행 (stroke/won_stroke nullable). apply는 Brenn 수동.
 */

import { getSoundOhaeng } from "../lib/names";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface StagedHanja {
  character: string;
  codepoint: number;
  hangeul: string;
  meaning: string | null;
  source: string;
  inname_ok: number;
}
interface StagedUnihan {
  codepoint: number;
  radical: string | null;
  total_strokes: number | null;
  meaning_en: string | null;
}
interface StagedWonStroke {
  codepoint: number;
  won_stroke: number | null;
}
interface StagedJaOhaeng {
  codepoint: number;
  ja_ohaeng: string | null;
}

interface HanjaRow {
  character: string;
  codepoint: number;
  hangeul: string;
  stroke: number | null;
  won_stroke: number | null;
  ohaeng: string;
  ja_ohaeng: string | null;
  radical: string | null;
  meaning: string | null;
  meaning_en: string | null;
  inname_ok: number;
}

const BATCH = 500;
const SPOT_CHECK = ["樂", "福", "浩", "拓", "美"];
const COLUMNS = [
  "character",
  "codepoint",
  "hangeul",
  "stroke",
  "won_stroke",
  "ohaeng",
  "ja_ohaeng",
  "radical",
  "meaning",
  "meaning_en",
  "inname_ok",
];
const OHAENG = ["목", "화", "토", "금", "수"] as const;

/** SQLite 문자열 리터럴 — 작은따옴표 doubling. null → NULL. */
function sqlStr(v: string | null): string {
  return v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
}
function sqlNum(v: number | null): string {
  return v === null ? "NULL" : String(v);
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");
  const migDir = join(scriptDir, "..", "migrations");

  const hanja = readJson<StagedHanja[]>(join(dataDir, "staged-hanja.json"));
  const unihan = readJson<StagedUnihan[]>(join(dataDir, "staged-unihan.json"));
  const wonStroke = readJson<StagedWonStroke[]>(
    join(dataDir, "staged-won-stroke.json"),
  );
  const jaOhaeng = readJson<StagedJaOhaeng[]>(
    join(dataDir, "staged-ja-ohaeng.json"),
  );

  const unihanByCp = new Map(unihan.map((r) => [r.codepoint, r]));
  const wonByCp = new Map(wonStroke.map((r) => [r.codepoint, r]));
  const jaByCp = new Map(jaOhaeng.map((r) => [r.codepoint, r]));
  console.log(
    `입력: hanja ${hanja.length} / unihan ${unihanByCp.size} / ` +
      `won-stroke ${wonByCp.size} / ja-ohaeng ${jaByCp.size}`,
  );
  for (const [label, size] of [
    ["unihan", unihanByCp.size],
    ["won-stroke", wonByCp.size],
    ["ja-ohaeng", jaByCp.size],
  ] as const) {
    if (size !== hanja.length) {
      throw new Error(
        `codepoint set 불일치: staged-hanja ${hanja.length} ≠ ${label} ${size}`,
      );
    }
  }

  // ── 5-way join ──
  const rows: HanjaRow[] = [];
  const joinFailures: string[] = [];
  for (const h of hanja) {
    const u = unihanByCp.get(h.codepoint);
    const w = wonByCp.get(h.codepoint);
    const j = jaByCp.get(h.codepoint);
    if (!u || !w || !j) {
      joinFailures.push(`codepoint ${h.codepoint} (${h.character}) join 누락`);
      continue;
    }
    const ohaeng = getSoundOhaeng(h.hangeul); // 음령오행 — lib/names.ts 재사용
    if (ohaeng === null) {
      joinFailures.push(
        `codepoint ${h.codepoint} (${h.character}) hangeul "${h.hangeul}" — 음령오행 산출 불가`,
      );
      continue;
    }
    rows.push({
      character: h.character,
      codepoint: h.codepoint,
      hangeul: h.hangeul,
      stroke: u.total_strokes,
      won_stroke: w.won_stroke,
      ohaeng,
      ja_ohaeng: j.ja_ohaeng,
      radical: u.radical,
      meaning: h.meaning,
      meaning_en: u.meaning_en,
      inname_ok: h.inname_ok,
    });
  }
  if (joinFailures.length > 0) {
    console.error(`join 실패 ${joinFailures.length}건:`);
    for (const f of joinFailures.slice(0, 10)) console.error(`  - ${f}`);
    process.exit(1);
  }
  rows.sort((a, b) => a.codepoint - b.codepoint);

  // ── 005 SQL 생성 (배치 분할) ──
  const lines: string[] = [
    "-- saju-naming: hanja 9,460 row bulk seed. C-5-6 (5-way join 적재).",
    "-- 생성: scripts/build-migration.ts (staged 4종 + 음령오행 join). 직접 수정 금지 — 재생성.",
    "-- 선행: 004_hanja_rebuild.sql (stroke/won_stroke nullable). apply는 Brenn 수동.",
    `-- row ${rows.length} / 배치 ${BATCH} row/INSERT.`,
    "",
  ];
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    lines.push(`INSERT INTO hanja (${COLUMNS.join(", ")}) VALUES`);
    batch.forEach((r, idx) => {
      const vals = [
        sqlStr(r.character),
        sqlNum(r.codepoint),
        sqlStr(r.hangeul),
        sqlNum(r.stroke),
        sqlNum(r.won_stroke),
        sqlStr(r.ohaeng),
        sqlStr(r.ja_ohaeng),
        sqlStr(r.radical),
        sqlStr(r.meaning),
        sqlStr(r.meaning_en),
        sqlNum(r.inname_ok),
      ].join(", ");
      lines.push(`  (${vals})${idx === batch.length - 1 ? ";" : ","}`);
    });
    lines.push("");
  }
  const outPath = join(migDir, "005_hanja_seed_full.sql");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
  console.log(`\n출력: ${outPath}`);

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
  const ohaengFilled = rows.filter((r) => r.ohaeng).length;
  const strokeNull = rows.filter((r) => r.stroke === null).length;
  const wonNull = rows.filter((r) => r.won_stroke === null).length;
  const jaNull = rows.filter((r) => r.ja_ohaeng === null).length;
  const meaningKo = rows.filter((r) => r.meaning !== null).length;
  const meaningEn = rows.filter((r) => r.meaning_en !== null).length;
  const meaningAny = rows.filter(
    (r) => r.meaning !== null || r.meaning_en !== null,
  ).length;

  console.log(`\n검증:`);
  expect("총 row", total, 9460);
  expect("ohaeng 채움 (NOT NULL)", ohaengFilled, 9460);
  expect("stroke NULL (비표준)", strokeNull, 405);
  expect("won_stroke NULL (비표준)", wonNull, 405);
  expect("ja_ohaeng NULL (비표준)", jaNull, 405);

  const eum: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const ja: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const r of rows) {
    eum[r.ohaeng] += 1;
    if (r.ja_ohaeng) ja[r.ja_ohaeng] += 1;
  }
  console.log(
    `  [정보] 음령오행 분포: ${OHAENG.map((o) => `${o} ${eum[o]}`).join(" / ")}`,
  );
  console.log(
    `  [정보] 자원오행 분포: ${OHAENG.map((o) => `${o} ${ja[o]}`).join(" / ")} (null ${jaNull})`,
  );
  console.log(
    `  [정보] meaning 채움: 한국어 ${meaningKo} / 영어 ${meaningEn} / 합집합 ${meaningAny}`,
  );

  console.log(`\nspot-check:`);
  for (const ch of SPOT_CHECK) {
    const r = rows.find((x) => x.character === ch);
    if (!r) {
      console.log(`  [FAIL] ${ch}: staged에 없음`);
      failures.push(`spot-check: ${ch} 누락`);
      continue;
    }
    console.log(
      `  ${ch} ${r.hangeul}: 음령 ${r.ohaeng} / 자원 ${r.ja_ohaeng} / ` +
        `필획 ${r.stroke} 원획 ${r.won_stroke} / 부수 ${r.radical}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    `\n검증 통과 — 005_hanja_seed_full.sql ${total.toLocaleString()} row 생성 완료.`,
  );
}

main();
