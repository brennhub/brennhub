/**
 * 39-C 추천 품질 — 상용도 티어(frequency) 산출.
 *
 * 목적: staged-hanja.json의 9,460 codepoint에 `frequency` 1~5 티어를 부여. recommend
 *       route의 `ORDER BY frequency DESC` 를 유효화(현재 전 row default 3 = 무효) → 풀 500이
 *       상용자 우선으로 채워지게 함. 출력은 007 migration(UPDATE)의 입력.
 *
 * 티어 (상용도 ↓):
 *   5 = 교육용 기초한자 1,800 (일반 문해 최상위 상용자)        — edu-hanja-1800.json
 *   4 = KS X 1001(K0) 등재, 1,800 밖 (인정 한자·작명자 다수)   — Unihan kIRG_KSource
 *   3 = KS X 1002(K1)
 *   2 = 확장(K2)
 *   1 = 그 외(K3/K4/K6) 또는 KS 미등재(none) — 최희귀
 *
 * 근거: per-한자 실사용 빈도 무료·기계가독 자료 미가용(39-C 정찰 확정) → **구조적 상용도 프록시**.
 *   KS X 1001(K0)은 작명자(珉·旼·旻 등) 포함 + 벽자(刁 K1·玢/玪 K2) 분리 = 작명 도구 적합.
 *   교육용 1,800은 더 좁은 일반 문해 상위 → 최상위 티어. 둘 다 license-clean(고시 사실 + Unicode ToU).
 *   한계(정직): K0 내 우열(玟 vs 珉) 미구분 — 작명-특화 빈도(한국어문회 급수)는 라이센스 blocked(backlog).
 *
 * 출처:
 *   - Unihan kIRG_KSource — Unicode Unihan Database (Unicode Terms of Use, 재배포 가능).
 *   - 교육용 1,800 — scripts/data/edu-hanja-1800.json (provenance 그 안에).
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-frequency.ts
 * 입력: staged-hanja.json (9,460 codepoint) + edu-hanja-1800.json + Unihan.zip (캐시 우선, miss 시 fetch)
 * 출력: staged-frequency.json (9,460 row {codepoint, frequency}, codepoint 오름차순) + 콘솔 검증 통계
 */

import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UNIHAN_URL = "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip";
const SPOT_CHECK = ["蘇", "玟", "刁", "玢", "玪", "珉", "旼", "美"];

interface StagedHanja {
  character: string;
  codepoint: number;
}
interface EduList {
  count: number;
  hanja: string[];
}
interface FrequencyRow {
  codepoint: number;
  frequency: number;
}

/** Unihan.zip 로드 — 캐시 우선, miss 시 Unicode raw fetch 후 .cache/ 저장 (build-staged-unihan.ts 패턴). */
async function loadUnihanZip(cachePath: string): Promise<AdmZip> {
  if (existsSync(cachePath)) {
    console.log(`[캐시]      Unihan.zip ← ${cachePath}`);
    return new AdmZip(cachePath);
  }
  console.log(`[fetch]     Unihan.zip ← ${UNIHAN_URL}`);
  const res = await fetch(UNIHAN_URL);
  if (!res.ok) {
    throw new Error(`Unihan.zip fetch 실패: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, buf);
  console.log(
    `[캐시 저장] Unihan.zip → ${cachePath} (${(buf.length / 1048576).toFixed(1)}MB)`,
  );
  return new AdmZip(buf);
}

/** kIRG_KSource 값("K0-5A47" 등)에서 K 소스 prefix(K0/K1/K2…) 추출. 미등재 null. */
function ksourcePrefix(value: string): string | null {
  const m = /^(K\d+)-/.exec(value.trim());
  return m ? m[1] : null;
}

/** K 소스 prefix → 기본 티어 (교육용 5는 별도 override). */
function tierFromKSource(prefix: string | null): number {
  switch (prefix) {
    case "K0":
      return 4;
    case "K1":
      return 3;
    case "K2":
      return 2;
    default:
      return 1; // K3/K4/K6 또는 미등재(none)
  }
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");
  const outputPath = join(dataDir, "staged-frequency.json");

  // 1. staged-hanja.json → codepoint set + char↔cp 매핑
  const staged = JSON.parse(
    readFileSync(join(dataDir, "staged-hanja.json"), "utf-8"),
  ) as StagedHanja[];
  const cpSet = new Set(staged.map((r) => r.codepoint));
  const cpByChar = new Map(staged.map((r) => [r.character, r.codepoint]));
  console.log(`staged-hanja codepoint set: ${cpSet.size}`);

  // 2. 교육용 1,800 → codepoint set (풀 ∩ 교육용)
  const edu = JSON.parse(
    readFileSync(join(dataDir, "edu-hanja-1800.json"), "utf-8"),
  ) as EduList;
  const eduCp = new Set<number>();
  let eduOutOfPool = 0;
  for (const ch of edu.hanja) {
    const cp = cpByChar.get(ch);
    if (cp === undefined) {
      eduOutOfPool++; // 풀(인명용) 밖 — 변형 자체 or 비인명용. tier-5 미적용, 무해.
      continue;
    }
    eduCp.add(cp);
  }
  console.log(
    `교육용 1,800: 풀 ∩ ${eduCp.size} / 풀밖 ${eduOutOfPool} (count ${edu.count})`,
  );

  // 3. Unihan.zip → kIRG_KSource prefix (codepoint ∈ set)
  const zip = await loadUnihanZip(join(dataDir, ".cache", "Unihan.zip"));
  const ksByCp = new Map<number, string>();
  let scannedFiles = 0;
  for (const entry of zip.getEntries()) {
    const name = entry.entryName;
    if (!name.includes("Unihan") || !name.endsWith(".txt")) continue;
    scannedFiles++;
    const text = entry.getData().toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line[0] === "#") continue;
      const tab1 = line.indexOf("\t");
      const tab2 = line.indexOf("\t", tab1 + 1);
      if (tab1 < 0 || tab2 < 0) continue;
      const field = line.slice(tab1 + 1, tab2);
      if (field !== "kIRG_KSource") continue;
      const cp = parseInt(line.slice(2, tab1), 16); // "U+XXXX" → 정수
      if (!cpSet.has(cp)) continue;
      const prefix = ksourcePrefix(line.slice(tab2 + 1));
      if (prefix) ksByCp.set(cp, prefix);
    }
  }
  console.log(
    `Unihan .txt 스캔: ${scannedFiles}개 / kIRG_KSource 채움 ${ksByCp.size} / 미등재 ${cpSet.size - ksByCp.size}`,
  );

  // 4. 티어 산출 (교육용 5 override → else K 소스 기반)
  const rows: FrequencyRow[] = [];
  for (const cp of [...cpSet].sort((x, y) => x - y)) {
    const frequency = eduCp.has(cp) ? 5 : tierFromKSource(ksByCp.get(cp) ?? null);
    rows.push({ codepoint: cp, frequency });
  }

  // 5. JSON 출력
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(rows, null, 2) + "\n", "utf-8");
  console.log(`\n출력: ${outputPath}`);

  // ── 검증 ───────────────────────────────────────────────
  const failures: string[] = [];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) dist[r.frequency]++;
  const total = rows.length;

  console.log(`\n검증:`);
  if (total !== 9460) failures.push(`총 row ${total} ≠ 9460`);
  console.log(
    `  ${total === 9460 ? "[OK]  " : "[FAIL]"} 총 row: ${total} (기대 9460)`,
  );
  console.log(
    `  [정보] 티어 분포: ` +
      `5(교육용) ${dist[5]} / 4(K0) ${dist[4]} / 3(K1) ${dist[3]} / 2(K2) ${dist[2]} / 1(희귀) ${dist[1]}`,
  );
  // 교육용 풀∩ == tier5 (override 정확성)
  if (dist[5] !== eduCp.size) {
    failures.push(`tier5 ${dist[5]} ≠ 교육용 풀∩ ${eduCp.size}`);
  }
  console.log(
    `  ${dist[5] === eduCp.size ? "[OK]  " : "[FAIL]"} tier5 == 교육용 풀∩: ${dist[5]} / ${eduCp.size}`,
  );

  // spot-check verbatim
  const cpFreq = new Map(rows.map((r) => [r.codepoint, r.frequency]));
  console.log(`\nspot-check (티어):`);
  for (const ch of SPOT_CHECK) {
    const cp = cpByChar.get(ch);
    if (cp === undefined) {
      console.log(`  ${ch}: 풀에 없음`);
      continue;
    }
    const ks = ksByCp.get(cp) ?? "none";
    console.log(
      `  ${ch} U+${cp.toString(16).toUpperCase()}: tier ${cpFreq.get(cp)} ` +
        `(${eduCp.has(cp) ? "교육용" : ks})`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    `\n검증 통과 — staged-frequency.json ${total.toLocaleString()} row 생성 완료.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
