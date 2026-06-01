/**
 * 39-C 추천 품질 — 007 frequency 티어 UPDATE migration 생성.
 *
 * 목적: staged-frequency.json(codepoint→티어 1~5)을 codepoint 기준 UPDATE SQL로 직렬화.
 *       004 스키마 `frequency INTEGER NOT NULL DEFAULT 3` + 005가 frequency 미지정 적재 →
 *       전 row 현재 3. **3이 아닌 티어(1/2/4/5)만 UPDATE** (티어 3 = 기본값 그대로, no-op 생략).
 *
 * 스키마 변경 없음 (기존 frequency 컬럼 재사용). recommend route의 `ORDER BY frequency DESC`가
 * 즉시 유효화 — 풀 500이 상용자 우선으로 채워짐. 자세한 근거: build-staged-frequency.ts.
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-migration-frequency.ts
 * 입력: scripts/data/staged-frequency.json
 * 출력: migrations/007_hanja_frequency_tier.sql (티어별 UPDATE … WHERE codepoint IN(배치 ≤500)) + 콘솔 통계
 *
 * apply는 Brenn 수동 (dev `--env preview --remote` → 검증 → prod `--remote`).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BATCH = 500; // D1 statement/변수 한도 대비 (005 적재와 동일 배치 크기)
const DEFAULT_TIER = 3; // 004 DEFAULT 3 — 생략 (no-op)
const TIER_LABEL: Record<number, string> = {
  5: "교육용 기초한자 1,800",
  4: "KS X 1001(K0)",
  3: "KS X 1002(K1) — 기본값, 생략",
  2: "확장(K2)",
  1: "그 외/미등재 — 최희귀",
};

interface FrequencyRow {
  codepoint: number;
  frequency: number;
}

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");
  const migDir = join(scriptDir, "..", "migrations");

  const rows = JSON.parse(
    readFileSync(join(dataDir, "staged-frequency.json"), "utf-8"),
  ) as FrequencyRow[];

  // 티어별 codepoint 묶기 (오름차순)
  const byTier = new Map<number, number[]>();
  for (const r of rows) {
    const arr = byTier.get(r.frequency);
    if (arr) arr.push(r.codepoint);
    else byTier.set(r.frequency, [r.codepoint]);
  }
  for (const arr of byTier.values()) arr.sort((a, b) => a - b);

  const lines: string[] = [
    "-- saju-naming 39-C: hanja.frequency 상용도 티어 부여. 추천 풀 상용자 우선.",
    "-- 생성: scripts/build-migration-frequency.ts (staged-frequency.json). 직접 수정 금지 — 재생성.",
    "-- 티어 5=교육용1800 / 4=KS X 1001(K0) / 3=KS X 1002(K1,기본값) / 2=확장(K2) / 1=그외·미등재.",
    "-- 티어 3은 004 DEFAULT 3 그대로 → UPDATE 생략. 스키마 변경 없음 (frequency 컬럼 재사용).",
    "-- apply는 Brenn 수동 (dev --env preview --remote → 검증 → prod --remote).",
    "",
  ];

  let stmtCount = 0;
  let updatedRows = 0;
  // 티어 내림차순 출력 (5→4→2→1), 3 생략
  for (const tier of [5, 4, 2, 1]) {
    const cps = byTier.get(tier) ?? [];
    if (cps.length === 0) continue;
    lines.push(`-- tier ${tier} (${TIER_LABEL[tier]}) — ${cps.length} row`);
    for (let i = 0; i < cps.length; i += BATCH) {
      const batch = cps.slice(i, i + BATCH);
      lines.push(
        `UPDATE hanja SET frequency = ${tier} WHERE codepoint IN (${batch.join(", ")});`,
      );
      stmtCount++;
    }
    lines.push("");
    updatedRows += cps.length;
  }

  const outPath = join(migDir, "007_hanja_frequency_tier.sql");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");

  // ── 통계 ──
  console.log(`출력: ${outPath}`);
  console.log(`\n티어 분포 (생성 기준):`);
  for (const tier of [5, 4, 3, 2, 1]) {
    const n = (byTier.get(tier) ?? []).length;
    const note = tier === DEFAULT_TIER ? " (기본값 — UPDATE 생략)" : "";
    console.log(`  tier ${tier} (${TIER_LABEL[tier]}): ${n}${note}`);
  }
  console.log(
    `\nUPDATE 문 ${stmtCount}개 / 갱신 row ${updatedRows} ` +
      `(티어3 ${(byTier.get(3) ?? []).length} = 기본값 유지) / 총 ${rows.length}`,
  );
  if (updatedRows + (byTier.get(3) ?? []).length !== rows.length) {
    console.error("검증 실패: 티어 합계 ≠ 총 row");
    process.exit(1);
  }
  console.log(`검증 통과 — 007_hanja_frequency_tier.sql 생성 완료.`);
}

main();
