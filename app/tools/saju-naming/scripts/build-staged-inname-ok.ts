/**
 * C-5-8 inname_ok 정확화 — staged-inname-ok-reconcile.json 빌드.
 *
 * 배경: 적재된 9,460자(rutopio gov 크롤)는 전부 inname_ok=1 (C-5-2 fallback).
 *   공식 인명용 한자 권위 리스트와 reconcile 필요하나, 권위 출처(법령 별표1
 *   「인명용추가한자표」)는 한자가 BMP 이미지로만 임베드 → 기계 추출 불가
 *   (C-5-8 정찰: docs/learnings/2026-05-21-saju-naming-c5-8-inname-ok-reconcile.md).
 *
 * 채택(Option B — 안전 부분 reconcile): 외부 추출 없이 데이터-검증 가능한 사실로
 *   reconcile. plane 10/15 코드포인트(codepoint ≥ 0xA0000)는 유효 Unicode CJK가
 *   아님 → 출생신고 등록 불가 → inname_ok=0 (보수적 제외, 안전 방향).
 *
 * 판정: codepoint ≥ 0xA0000 (655360)
 *   = plane 10 (U+A0000~, Unicode 미지정 영역) ∪ plane 15 (U+F0000~, 사설영역 SPUA-A).
 *   유효 CJK는 최대 plane 3 (ExtG~I·호환보충) → 0xA0000은 안전 임계.
 * 교차검증: 위 set == staged-unihan.json 의 total_strokes=null set
 *   (C-5-3 Unihan join 실패 = 비표준 405자) — 불일치 시 중단(exit 1).
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-inname-ok.ts
 * 입력: scripts/data/staged-hanja.json + scripts/data/staged-unihan.json
 * 출력: scripts/data/staged-inname-ok-reconcile.json + 콘솔 검증 통계
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** plane 10 시작 = 유효 CJK 범위 밖 임계 (plane 3 ExtG~I 가 최대). */
const NONSTANDARD_THRESHOLD = 0xa0000; // 655360

interface HanjaRow {
  character: string;
  codepoint: number;
  hangeul: string;
  inname_ok: number;
}

interface UnihanRow {
  codepoint: number;
  character: string;
  total_strokes: number | null;
}

interface ReconcileEntry {
  character: string;
  codepoint: number;
  plane: number;
  hangeul: string;
}

interface ReconcileFile {
  task: string;
  date: string;
  criterion: string;
  source: string;
  rationale: string;
  generatedBy: string;
  count: number;
  planeBreakdown: { plane10: number; plane15: number };
  codepoints: ReconcileEntry[];
}

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");

  const hanja = JSON.parse(
    readFileSync(join(dataDir, "staged-hanja.json"), "utf-8"),
  ) as HanjaRow[];
  const unihan = JSON.parse(
    readFileSync(join(dataDir, "staged-unihan.json"), "utf-8"),
  ) as UnihanRow[];
  console.log(`staged-hanja: ${hanja.length} row / staged-unihan: ${unihan.length} row`);

  const failures: string[] = [];

  // 1. 비표준 판정 — codepoint ≥ 0xA0000
  const nonstandard = hanja
    .filter((h) => h.codepoint >= NONSTANDARD_THRESHOLD)
    .sort((a, b) => a.codepoint - b.codepoint);

  // 2. 교차검증 — staged-unihan.json total_strokes=null set 과 일치해야 함
  const unihanNull = new Set(
    unihan.filter((u) => u.total_strokes == null).map((u) => u.codepoint),
  );
  const nonstandardCp = new Set(nonstandard.map((h) => h.codepoint));
  const onlyUnihan = [...unihanNull].filter((c) => !nonstandardCp.has(c));
  const onlyRange = [...nonstandardCp].filter((c) => !unihanNull.has(c));
  if (onlyUnihan.length > 0 || onlyRange.length > 0) {
    failures.push(
      `교차검증 불일치 — unihan-null only ${onlyUnihan.length} / range only ${onlyRange.length}`,
    );
  } else {
    console.log(
      `교차검증 통과 — codepoint≥0xA0000 set == staged-unihan total_strokes=null set (${unihanNull.size}자)`,
    );
  }

  // 3. plane 분포
  const plane10 = nonstandard.filter((h) => h.codepoint < 0xf0000).length;
  const plane15 = nonstandard.filter((h) => h.codepoint >= 0xf0000).length;

  // 4. 정합성 — 표준 CJK(plane 0/2)가 비표준에 섞이지 않았는지
  const leak = nonstandard.filter((h) => {
    const p = Math.floor(h.codepoint / 0x10000);
    return p !== 10 && p !== 15;
  });
  if (leak.length > 0) {
    failures.push(`plane 10/15 외 코드포인트 ${leak.length}자 혼입`);
  }

  const out: ReconcileFile = {
    task: "C-5-8",
    date: "2026-05-21",
    criterion:
      "codepoint >= 0xA0000 (655360) — plane 10(U+A0000~, Unicode 미지정) ∪ plane 15(U+F0000~, 사설영역 SPUA-A). 유효 Unicode CJK 범위 밖.",
    source:
      "BrennHub staged-hanja.json 9,460 자체 코드포인트 검사 (외부 권위 리스트 추출 불가 — 법령 별표1 인명용추가한자표는 한자가 BMP 이미지 임베드. C-5-8 정찰).",
    rationale:
      "유효 Unicode CJK가 아닌 코드포인트는 가족관계등록(출생신고) 시스템에 입력 불가 → 추천 시 등록 거부 risk. 보수적 제외(안전 방향) — inname_ok=0.",
    generatedBy: "scripts/build-staged-inname-ok.ts",
    count: nonstandard.length,
    planeBreakdown: { plane10, plane15 },
    codepoints: nonstandard.map((h) => ({
      character: h.character,
      codepoint: h.codepoint,
      plane: Math.floor(h.codepoint / 0x10000),
      hangeul: h.hangeul,
    })),
  };

  // 콘솔 통계
  const before = hanja.filter((h) => h.inname_ok === 1).length;
  console.log(`\n=== reconcile 통계 ===`);
  console.log(`  비표준(inname_ok→0): ${out.count} (plane10 ${plane10} / plane15 ${plane15})`);
  console.log(`  inname_ok=1: ${before} → ${before - out.count}`);
  console.log(`  spot-check (앞 3):`);
  for (const e of out.codepoints.slice(0, 3)) {
    console.log(`    ${e.character} U+${e.codepoint.toString(16).toUpperCase()} (plane ${e.plane}, 음 ${e.hangeul})`);
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    join(dataDir, "staged-inname-ok-reconcile.json"),
    JSON.stringify(out, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `\n검증 통과 — staged-inname-ok-reconcile.json ${out.count} codepoint 생성 완료.`,
  );
}

main();
