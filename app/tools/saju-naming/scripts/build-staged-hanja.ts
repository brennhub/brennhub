/**
 * C-5-2 본 적재 — rutopio gov+naver CSV → staged JSON 빌드.
 *
 * 목적: 대법원 인명용 한자 풀 데이터(9,460자)를 D1 적재 직전 단계인
 *       staged JSON으로 변환. C-5-6(bulk INSERT 마이그레이션 생성)의 입력.
 *
 * 출처: rutopio/Korean-Name-Hanja-Charset (GitHub, MIT 라이센스)
 *       - data-gov.csv   — 대법원 인명용 한자 크롤 (hangul, consonant, unicode, hanja)
 *       - data-naver.csv — 네이버 한자사전 크롤 (+ meaning, id)
 *       정찰 시점 기준: 2026-05-19 (docs/learnings/2026-05-19-saju-naming-c5-2-recon.md).
 *       fetch는 HEAD URL — 산출 JSON은 commit으로 고정되므로 재현성은 commit이 담보.
 *
 * 실행: npx tsx app/tools/saju-naming/scripts/build-staged-hanja.ts
 *
 * 입력: rutopio gov+naver CSV (scripts/data/.cache/ 캐시 우선, miss 시 raw fetch)
 * 출력: scripts/data/staged-hanja.json (9,460 row, 2-space pretty)
 *       + 콘솔 검증 통계 (총 row / naver-cover / gov-only / 음 복수 / spot-check)
 *
 * 핵심 결정 (자문 thread 누적):
 *   - hangeul/hangeul_all = gov hangul 콤마-리스트 (대법원 인명용 지정 발음 authority).
 *     gov 발음 gap(빈칸) 시에만 naver 발음 fallback (현재 𥡴 U+25874 1자 해당).
 *   - meaning/meaning_all = naver verbatim "훈 음" 형식 (예: "아름다울 미"). 훈-음 분리는 C-5-6.
 *   - 9,460 전량 inname_ok=1 (fallback). 71자 초과 reconcile은 C-5-8(critical) 전담.
 *   - Join key = Unicode 코드포인트 정수 (parseInt(hex, 16)).
 */

import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RUTOPIO_RAW =
  "https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/HEAD";
const GOV_URL = `${RUTOPIO_RAW}/data-gov.csv`;
const NAVER_URL = `${RUTOPIO_RAW}/data-naver.csv`;

const SPOT_CHECK = ["樂", "復", "行", "易", "度"];

interface GovRow {
  hangul: string;
  consonant: string;
  unicode: string;
  hanja: string;
}

interface NaverRow extends GovRow {
  meaning: string;
  id: string;
}

interface StagedHanja {
  character: string;
  codepoint: number;
  hangeul: string;
  hangeul_all: string[];
  meaning: string | null;
  meaning_all: string[];
  meaning_en: string | null;
  source: "gov+naver" | "gov-only";
  inname_ok: number;
}

/** 캐시 우선 로드 — miss 시 rutopio raw fetch 후 .cache/ 저장. */
async function loadCsv(
  label: string,
  cachePath: string,
  url: string,
): Promise<string> {
  if (existsSync(cachePath)) {
    console.log(`[캐시]      ${label.padEnd(5)} ← ${cachePath}`);
    return readFileSync(cachePath, "utf-8");
  }
  console.log(`[fetch]     ${label.padEnd(5)} ← ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `${label} CSV fetch 실패: HTTP ${res.status} ${res.statusText} — ${url}`,
    );
  }
  const text = await res.text();
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, text, "utf-8");
  console.log(`[캐시 저장] ${label.padEnd(5)} → ${cachePath}`);
  return text;
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(scriptDir, "data");
  const cacheDir = join(dataDir, ".cache");
  const outputPath = join(dataDir, "staged-hanja.json");

  // 1. 입력 로드 (캐시 → fetch)
  const govText = await loadCsv("gov", join(cacheDir, "data-gov.csv"), GOV_URL);
  const naverText = await loadCsv(
    "naver",
    join(cacheDir, "data-naver.csv"),
    NAVER_URL,
  );

  // 2. robust CSV 파싱 (따옴표/콤마 처리 — gov 복수음 "낙,락,악,요" 필드 보호)
  const csvOpts = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  };
  // csv-parse는 columns 옵션을 런타임에만 해석 → 정적 타입은 string[][].
  // unknown 경유로 캐스트 (columns:true → 헤더 키 객체 배열이 실제 반환값).
  const govRows = parse(govText, csvOpts) as unknown as GovRow[];
  const naverRows = parse(naverText, csvOpts) as unknown as NaverRow[];
  console.log(
    `\n입력: gov ${govRows.length.toLocaleString()} rows / ` +
      `naver ${naverRows.length.toLocaleString()} rows`,
  );

  // 3~5. 코드포인트 정규화 + groupBy (gov 첫 row / naver readings 배열)
  const govByCp = new Map<number, GovRow>();
  let govInvalid = 0;
  for (const row of govRows) {
    const cp = parseInt(row.unicode, 16);
    if (!Number.isFinite(cp)) {
      govInvalid++;
      continue;
    }
    if (!govByCp.has(cp)) govByCp.set(cp, row);
  }

  const naverByCp = new Map<number, NaverRow[]>();
  let naverInvalid = 0;
  for (const row of naverRows) {
    const cp = parseInt(row.unicode, 16);
    if (!Number.isFinite(cp)) {
      naverInvalid++;
      continue;
    }
    const arr = naverByCp.get(cp);
    if (arr) arr.push(row);
    else naverByCp.set(cp, [row]);
  }
  if (govInvalid || naverInvalid) {
    console.log(
      `잘못된 코드포인트 skip: gov ${govInvalid} / naver ${naverInvalid}`,
    );
  }

  // 6~7. join (gov 9,460 superset 기준) + primary 결정
  //   hangeul/hangeul_all = 전 한자 gov hangul 콤마-리스트 (대법원 인명용 지정 발음 authority).
  //     naver 발음(한자사전 전체)은 인명용 비허용 발음 포함 가능 → hangeul 후보로 부적합.
  //   meaning/meaning_all = naver verbatim "훈 음" (독립 리스트). gov-only면 null/[].
  const staged: StagedHanja[] = [];
  let charMismatch = 0;
  let govHangulGap = 0;
  for (const [codepoint, govRow] of govByCp) {
    const character = String.fromCodePoint(codepoint);
    if (govRow.hanja && govRow.hanja !== character) charMismatch++;

    // 인명용 발음 = gov hangul 콤마-리스트 (중복 제거, 첫 음이 primary)
    let hangeul_all = [
      ...new Set(
        govRow.hangul
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];

    const naverGroup = naverByCp.get(codepoint);
    if (naverGroup && naverGroup.length > 0) {
      // naver = meaning 소스. 읽기별 row → 중복 읽기 제거(첫 등장 유지) 후 의미 verbatim.
      const seen = new Set<string>();
      const naverHangeul: string[] = [];
      const naverMeanings: string[] = [];
      for (const nr of naverGroup) {
        if (seen.has(nr.hangul)) continue;
        seen.add(nr.hangul);
        naverHangeul.push(nr.hangul);
        naverMeanings.push((nr.meaning ?? "").trim());
      }
      // gov 발음 gap(빈칸) 보완: gov가 발음을 0개 줄 때만 naver 발음 fallback.
      //   gov가 1개 이상 주면 gov 유지 (authority). 현재 𥡴(U+25874) 1자 해당.
      if (hangeul_all.length === 0) {
        hangeul_all = [...new Set(naverHangeul.filter(Boolean))];
        govHangulGap++;
      }
      staged.push({
        character,
        codepoint,
        hangeul: hangeul_all[0] ?? "",
        hangeul_all,
        meaning: naverMeanings[0] || null,
        meaning_all: naverMeanings.filter(Boolean),
        meaning_en: null,
        source: "gov+naver",
        inname_ok: 1,
      });
    } else {
      staged.push({
        character,
        codepoint,
        hangeul: hangeul_all[0] ?? "",
        hangeul_all,
        meaning: null,
        meaning_all: [],
        meaning_en: null,
        source: "gov-only",
        inname_ok: 1,
      });
    }
  }

  // naver-only(gov universe 밖) 자수 — 참고용
  let naverOnly = 0;
  for (const cp of naverByCp.keys()) {
    if (!govByCp.has(cp)) naverOnly++;
  }

  // 8. 코드포인트 오름차순 정렬 후 JSON 출력 (결정적 diff)
  staged.sort((a, b) => a.codepoint - b.codepoint);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(staged, null, 2) + "\n", "utf-8");
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

  const total = staged.length;
  const govNaver = staged.filter((r) => r.source === "gov+naver");
  const govOnly = staged.filter((r) => r.source === "gov-only");
  const multiReading = staged.filter((r) => r.hangeul_all.length > 1).length;
  const noMeaning = govNaver.filter((r) => r.meaning === null);

  console.log(`\n검증:`);
  expect("총 row", total, 9460);
  expect("naver-cover (source=gov+naver)", govNaver.length, 7960);
  expect("gov-only (source=gov-only)", govOnly.length, 1500);
  expect("음 복수 (hangeul_all>1, gov 인명용 발음)", multiReading, 863);

  // 음 복수 분포
  const dist = new Map<number, number>();
  for (const r of staged) {
    const n = r.hangeul_all.length;
    dist.set(n, (dist.get(n) ?? 0) + 1);
  }
  const distStr = [...dist.keys()]
    .sort((a, b) => a - b)
    .map((n) => `${n}음 ${dist.get(n)}`)
    .join(" / ");
  console.log(`  음 복수 분포: ${distStr}`);
  console.log(
    `  참고: naver-only(gov 밖) ${naverOnly}자 제외 / ` +
      `gov 발음 gap→naver fallback ${govHangulGap}자 / ` +
      `character↔codepoint 불일치 ${charMismatch}`,
  );

  // meaning 결측 gov+naver — C-5-3 Unihan 영어정의 / C-5-8 reconcile 참조용
  console.log(`\nmeaning 결측 gov+naver ${noMeaning.length}자:`);
  for (const r of noMeaning) {
    console.log(
      `  U+${r.codepoint.toString(16).toUpperCase().padStart(4, "0")} ${r.character}`,
    );
  }

  // spot-check 5건 (verbatim)
  console.log(`\nspot-check:`);
  for (const ch of SPOT_CHECK) {
    const row = staged.find((r) => r.character === ch);
    if (!row) {
      console.log(`  [FAIL] ${ch}: staged에 없음`);
      failures.push(`spot-check: ${ch} 누락`);
      continue;
    }
    console.log(
      `  ${ch} U+${row.codepoint.toString(16).toUpperCase()} ` +
        `[${row.source}] hangeul_all=${JSON.stringify(row.hangeul_all)} ` +
        `meaning_all=${JSON.stringify(row.meaning_all)}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n검증 실패 ${failures.length}건:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n검증 통과 — staged-hanja.json ${total.toLocaleString()} row 생성 완료.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
