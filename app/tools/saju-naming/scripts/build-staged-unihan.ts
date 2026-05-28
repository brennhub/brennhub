/**
 * C-5-3 Unihan 추출 — 9,460 한자 부수/획수/영어 의미.
 *
 * 목적: staged-hanja.json의 9,460 codepoint에 대해 Unihan에서 부수(kRSUnicode) /
 *       필획(kTotalStrokes) / 영어 정의(kDefinition)를 추출. C-5-6(bulk INSERT)의 입력.
 *
 * 출처: Unicode Unihan Database — https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
 *       라이센스: Unicode Terms of Use (사용 자유, 재배포 가능). 정찰 시점: 2026-05-20.
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-unihan.ts
 *
 * 입력: staged-hanja.json (9,460 codepoint set) + Unihan.zip (캐시 우선, miss 시 fetch)
 * 출력: staged-unihan.json (9,460 row, 2-space pretty) + 콘솔 검증 통계
 *
 * 핵심 결정:
 *   - 부수 표준 = kRSUnicode (부수번호 1~214 = 강희 214부수). kRSKangXi는 Unicode 15.1에서
 *     withdrawn → kRSUnicode 사용 (강희사전 부수 표준 의도 그대로 유지, 타협 아님).
 *   - kRSUnicode/kTotalStrokes 다중값 → 첫 값 + 다중값 한자 수 콘솔 record.
 *   - kRSUnicode 간화부수형 아포스트로피(예: "120'.3")는 제거 → 부수번호만 취득.
 *   - meaning_en = kDefinition verbatim (raw 보존, 가공은 별도 task).
 *   - zip 내 모든 Unihan_*.txt 스캔 (UAX #38: 필드의 .txt 위치 불보장).
 *   - Scope = staged-hanja.json codepoint 한정 (Unihan 전체 ~10만 over-scope).
 */

import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UNIHAN_URL = "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip";
const FIELDS = new Set(["kRSUnicode", "kTotalStrokes", "kDefinition"]);
const SPOT_CHECK = ["樂", "美", "福", "復", "行"];

// 214 강희 부수 (획수 그룹별, 전통 한자형). RADICALS[n-1] = 부수 n.
const RADICAL_GROUPS: [number, string][] = [
  [1, "一丨丶丿乙亅"],
  [2, "二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又"],
  [3, "口囗土士夂夊夕大女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳"],
  [4, "心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬"],
  [5, "玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立"],
  [6, "竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舛舟艮色艸虍虫血行衣襾"],
  [7, "見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里"],
  [8, "金長門阜隶隹雨靑非"],
  [9, "面革韋韭音頁風飛食首香"],
  [10, "馬骨高髟鬥鬯鬲鬼"],
  [11, "魚鳥鹵鹿麥麻"],
  [12, "黃黍黑黹"],
  [13, "黽鼎鼓鼠"],
  [14, "鼻齊"],
  [15, "齒"],
  [16, "龍龜"],
  [17, "龠"],
];
const RADICALS: { char: string; strokes: number }[] = [];
for (const [strokes, chars] of RADICAL_GROUPS) {
  for (const char of chars) RADICALS.push({ char, strokes });
}
if (RADICALS.length !== 214) {
  throw new Error(`214 부수 표 손상: ${RADICALS.length}개 (214 기대)`);
}

interface UnihanRow {
  codepoint: number;
  character: string;
  radical: string | null;
  radical_number: number | null;
  additional_strokes: number | null;
  total_strokes: number | null;
  meaning_en: string | null;
}

interface Acc {
  radical_number: number | null;
  additional_strokes: number | null;
  rsApostrophe: boolean;
  rsMulti: boolean;
  total_strokes: number | null;
  tsMulti: boolean;
  meaning_en: string | null;
}

/** Unihan.zip 로드 — 캐시 우선, miss 시 Unicode raw fetch 후 .cache/ 저장. */
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

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");
  const outputPath = join(dataDir, "staged-unihan.json");

  // 1. staged-hanja.json → codepoint set + C-5-2 meaning 결측 codepoint (교차검증용)
  const staged = JSON.parse(
    readFileSync(join(dataDir, "staged-hanja.json"), "utf-8"),
  ) as { codepoint: number; source: string; meaning: string | null }[];
  const cpSet = new Set(staged.map((r) => r.codepoint));
  const c52NoMeaning = new Set(
    staged
      .filter((r) => r.source === "gov+naver" && r.meaning === null)
      .map((r) => r.codepoint),
  );
  console.log(
    `staged-hanja codepoint set: ${cpSet.size} / C-5-2 meaning 결측: ${c52NoMeaning.size}`,
  );

  // 2. Unihan.zip 로드
  const zip = await loadUnihanZip(join(dataDir, ".cache", "Unihan.zip"));

  // 3~5. 모든 Unihan_*.txt 스캔 → kRSUnicode/kTotalStrokes/kDefinition 추출 (codepoint ∈ set)
  const acc = new Map<number, Acc>();
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
      if (!FIELDS.has(field)) continue;
      const cp = parseInt(line.slice(2, tab1), 16); // "U+XXXX" → 정수
      if (!cpSet.has(cp)) continue;
      const value = line.slice(tab2 + 1).trim();

      let a = acc.get(cp);
      if (!a) {
        a = {
          radical_number: null,
          additional_strokes: null,
          rsApostrophe: false,
          rsMulti: false,
          total_strokes: null,
          tsMulti: false,
          meaning_en: null,
        };
        acc.set(cp, a);
      }
      if (field === "kRSUnicode") {
        const tokens = value.split(/\s+/);
        a.rsMulti = tokens.length > 1;
        const m = /^(\d+)('*)\.(-?\d+)$/.exec(tokens[0]);
        if (m) {
          a.radical_number = parseInt(m[1], 10);
          a.rsApostrophe = m[2].length > 0;
          a.additional_strokes = parseInt(m[3], 10);
        }
      } else if (field === "kTotalStrokes") {
        const tokens = value.split(/\s+/);
        a.tsMulti = tokens.length > 1;
        a.total_strokes = parseInt(tokens[0], 10);
      } else if (field === "kDefinition") {
        a.meaning_en = value || null;
      }
    }
  }
  console.log(`Unihan .txt 스캔: ${scannedFiles}개 파일`);

  // 6~7. row 빌드 (codepoint 오름차순)
  const rows: UnihanRow[] = [];
  for (const cp of [...cpSet].sort((x, y) => x - y)) {
    const a = acc.get(cp);
    const rn = a?.radical_number ?? null;
    rows.push({
      codepoint: cp,
      character: String.fromCodePoint(cp),
      radical:
        rn !== null && rn >= 1 && rn <= 214 ? RADICALS[rn - 1].char : null,
      radical_number: rn,
      additional_strokes: a?.additional_strokes ?? null,
      total_strokes: a?.total_strokes ?? null,
      meaning_en: a?.meaning_en ?? null,
    });
  }

  // 8. JSON 출력
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
  const rsCover = rows.filter((r) => r.radical_number !== null).length;
  const tsCover = rows.filter((r) => r.total_strokes !== null).length;
  const defCover = rows.filter((r) => r.meaning_en !== null).length;

  // 비표준 codepoint (plane 10 미할당 / plane 15 PUA) — Unihan 미수록
  const nonStandard = rows.filter((r) => r.radical_number === null);
  const plane10 = nonStandard.filter((r) => (r.codepoint >> 16) === 10).length;
  const plane15 = nonStandard.filter((r) => (r.codepoint >> 16) === 15).length;

  console.log(`\n검증:`);
  expect("총 row", total, 9460);
  expect("kRSUnicode 채움 (실제 CJK)", rsCover, 9055);
  expect("kTotalStrokes 채움 (실제 CJK)", tsCover, 9055);
  console.log(
    `  [정보] 비표준 codepoint ${nonStandard.length}자 (plane10 미할당 ${plane10} / plane15 PUA ${plane15}) — Unihan 미수록, 정상`,
  );
  console.log(
    `  [정보] recon 군 A (비표준 ~406자)와 일치 — 실측 ${nonStandard.length}자, Unihan 정상 동작`,
  );

  // kDefinition 채움 — gate 아님 (벽자 다수 결측 정상)
  const defPct = ((defCover / total) * 100).toFixed(1);
  console.log(`  [정보] kDefinition 채움: ${defCover}/${total} (${defPct}%) — 결측 ${total - defCover}자`);
  let c52WithDef = 0;
  for (const cp of c52NoMeaning) {
    if (acc.get(cp)?.meaning_en) c52WithDef++;
  }
  console.log(
    `  [교차] C-5-2 meaning 결측 ${c52NoMeaning.size}자 중 kDefinition 보유 ${c52WithDef}자 → 영어 의미로 복구 가능`,
  );

  // sanity: 부수획수 + additional_strokes == total_strokes (다중값·간화부수형 제외)
  let sanityOk = 0;
  let sanityTotal = 0;
  for (const r of rows) {
    const a = acc.get(r.codepoint);
    if (!a || a.rsMulti || a.tsMulti || a.rsApostrophe) continue;
    if (
      r.radical_number === null ||
      r.additional_strokes === null ||
      r.total_strokes === null
    ) {
      continue;
    }
    sanityTotal++;
    const radStrokes = RADICALS[r.radical_number - 1].strokes;
    if (radStrokes + r.additional_strokes === r.total_strokes) sanityOk++;
  }
  const sanityPct = ((sanityOk / sanityTotal) * 100).toFixed(1);
  console.log(
    `  [정보] sanity (부수획수+잔여==총획): ${sanityOk}/${sanityTotal} (${sanityPct}%)`,
  );

  // 다중값 / 간화부수형 한자 수
  let rsMultiN = 0;
  let tsMultiN = 0;
  let apostropheN = 0;
  for (const a of acc.values()) {
    if (a.rsMulti) rsMultiN++;
    if (a.tsMulti) tsMultiN++;
    if (a.rsApostrophe) apostropheN++;
  }
  console.log(
    `  [정보] 다중값: kRSUnicode ${rsMultiN}자 / kTotalStrokes ${tsMultiN}자 / 간화부수형(아포스트로피) ${apostropheN}자`,
  );

  // spot-check 5건 verbatim
  console.log(`\nspot-check:`);
  for (const ch of SPOT_CHECK) {
    const r = rows.find((x) => x.character === ch);
    if (!r) {
      console.log(`  [FAIL] ${ch}: staged-unihan에 없음`);
      failures.push(`spot-check: ${ch} 누락`);
      continue;
    }
    console.log(
      `  ${ch} U+${r.codepoint.toString(16).toUpperCase()}: ` +
        `부수 ${r.radical}(${r.radical_number}) +${r.additional_strokes}획 / ` +
        `총 ${r.total_strokes}획 / "${r.meaning_en ?? "—"}"`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n검증 통과 — staged-unihan.json ${total.toLocaleString()} row 생성 완료.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
