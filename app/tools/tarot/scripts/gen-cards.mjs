/**
 * 타로 사전 변환 스크립트 (one-shot).
 * app/tools/tarot/DICTIONARY.md (v0.3 동결) → lib/tarot/cards.ts (typed const).
 *
 * 실행: node app/tools/tarot/scripts/gen-cards.mjs [--force]
 *
 * ⚠️ cards.ts가 이미 존재하면 --force 없이는 중단한다.
 *    편집장 검수 피드백은 cards.ts에 직접 반영되므로(DICTIONARY.md는 스냅샷),
 *    재생성하면 그 수정이 전부 덮어써진다.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IN_PATH = resolve(HERE, "../DICTIONARY.md");
const OUT_PATH = resolve(HERE, "../../../../lib/tarot/cards.ts");

const ROMAN = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
];

const DOMAIN_BY_KO = {
  "연애": "love",
  "일·직업": "work", // U+00B7 가운뎃점 — 정확 일치만 허용
  "돈": "money",
  "관계": "relation",
  "자기": "self",
};

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (existsSync(OUT_PATH) && !process.argv.includes("--force")) {
  fail(
    "lib/tarot/cards.ts 이미 존재. 편집장 검수 수정이 들어있을 수 있다 — " +
      "재생성하면 덮어써짐. 정말 필요하면 --force.",
  );
}

const raw = readFileSync(IN_PATH, "utf8").replace(/\r\n/g, "\n");

/** 따옴표(직선/곡선)로 감싼 본문 추출. */
const Q_OPEN = '["“]';
const Q_CLOSE = '["”]';

/** 괄호 depth 0의 콤마로 분할 (상징 노트 안 콤마 방어). */
function splitSymbols(payload) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of payload) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseOrientation(section, label, ctx) {
  const headRe = new RegExp(
    `^\\*\\*${label}\\*\\* — essence: ${Q_OPEN}(.+?)${Q_CLOSE}\\s*$`,
    "m",
  );
  const headMatch = section.match(headRe);
  if (!headMatch) fail(`${ctx}: ${label} essence 라인 없음`);
  const essence = headMatch[1].trim();

  const after = section.slice(headMatch.index + headMatch[0].length);
  const waiteMatch = after.match(
    new RegExp(`^원전\\(Waite\\): ${Q_OPEN}(.+)${Q_CLOSE}\\s*$`, "m"),
  );
  if (!waiteMatch) fail(`${ctx}: ${label} 원전(Waite) 라인 없음`);
  const waite = waiteMatch[1].trim();

  // 키워드 테이블: 헤더/구분 행 스킵 후 연속 row 소비
  const lines = after.slice(waiteMatch.index + waiteMatch[0].length).split("\n");
  const keywords = [];
  let inTable = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) {
      if (inTable) break; // 테이블 종료
      if (t.startsWith("**")) break; // 테이블 없이 다음 방향 도달 = 포맷 이상
      continue;
    }
    inTable = true;
    if (/^\|\s*키워드\s*\|/.test(t)) continue; // 헤더 행
    if (/^\|[-\s|]+\|$/.test(t)) continue; // 구분 행 |---|---|---|
    const cells = t
      .split("|")
      .slice(1, -1)
      .map((s) => s.trim());
    if (cells.length !== 3) fail(`${ctx}: ${label} 테이블 행 셀 수 ${cells.length} ≠ 3 — "${t}"`);
    const [word, domainsRaw, gloss] = cells;
    const domains = domainsRaw.split(",").map((s) => {
      const ko = s.trim();
      const mapped = DOMAIN_BY_KO[ko];
      if (!mapped) fail(`${ctx}: ${label} 키워드 "${word}" 미지 도메인 라벨 "${ko}"`);
      return mapped;
    });
    keywords.push({ word: { ko: word }, domains, gloss: { ko: gloss } });
  }

  return { essence: { ko: essence }, waite, keywords };
}

const sections = raw.split(/^## /m);
const cards = [];

for (const section of sections) {
  const headingLine = section.split("\n", 1)[0];
  const m = headingLine.match(/^(0|[IVX]+)\.\s+(.+?)\s+\((.+?)\)\s*$/);
  if (!m) continue; // 파일 머리말 · 검수 가이드 등 스킵

  const id = ROMAN.indexOf(m[1]);
  if (id === -1) fail(`로마자 해석 불가: "${m[1]}" (${headingLine})`);
  const nameKo = m[2].trim();
  const nameEn = m[3].trim();
  const slug = nameEn
    .replace(/^The\s+/i, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const ctx = `${m[1]}. ${nameKo}`;

  const metaMatch = section.match(/^\*\*meta\*\* — (.+)$/m);
  if (!metaMatch) fail(`${ctx}: meta 라인 없음`);
  const segments = metaMatch[1].split(/\s·\s/);

  const numMatch = segments[0].match(/^수비학 (\d+)$/);
  if (!numMatch) fail(`${ctx}: meta 첫 세그먼트가 수비학이 아님 — "${segments[0]}"`);
  const meta = { numerology: Number(numMatch[1]) };

  let symbolsPayload = null;
  for (const seg of segments.slice(1)) {
    let sm;
    if ((sm = seg.match(/^원소 (.+)$/))) meta.element = { ko: sm[1].trim() };
    else if ((sm = seg.match(/^점성 (.+)$/))) meta.astrology = { ko: sm[1].trim() };
    else if (seg.startsWith("상징: ")) symbolsPayload = seg.slice("상징: ".length);
    else fail(`${ctx}: meta 미지 세그먼트 — "${seg}"`);
  }
  if (!symbolsPayload) fail(`${ctx}: 상징 세그먼트 없음`);
  meta.symbols = splitSymbols(symbolsPayload).map((ko) => ({ ko }));

  cards.push({
    id,
    slug,
    name: { ko: nameKo, en: nameEn },
    meta,
    upright: parseOrientation(section, "정방향", ctx),
    reversed: parseOrientation(section, "역방향", ctx),
  });
}

// ---- assert 검증 ----------------------------------------------------------

function assert(cond, msg) {
  if (!cond) fail(`assert 실패: ${msg}`);
}

assert(cards.length === 22, `카드 수 ${cards.length} ≠ 22`);
cards.forEach((c, i) => assert(c.id === i, `문서 순서 ${i}번째 카드 id=${c.id} — 0~21 정렬 깨짐`));
assert(new Set(cards.map((c) => c.slug)).size === 22, "slug 중복");
cards.forEach((c) => {
  assert(c.name.ko && c.name.en, `${c.slug}: 이름 빈 값`);
  assert(c.meta.numerology === c.id, `${c.slug}: 수비학 ${c.meta.numerology} ≠ id ${c.id}`);
  assert(c.meta.symbols.length > 0, `${c.slug}: 상징 0개`);
  for (const [label, o] of [["정방향", c.upright], ["역방향", c.reversed]]) {
    assert(o.essence.ko.length > 0, `${c.slug} ${label}: essence 빈 값`);
    assert(o.waite.length > 0, `${c.slug} ${label}: waite 빈 값`);
    assert(
      o.keywords.length >= 4 && o.keywords.length <= 6,
      `${c.slug} ${label}: 키워드 ${o.keywords.length}개 (4~6 위반)`,
    );
    for (const k of o.keywords) {
      assert(k.word.ko && k.gloss.ko, `${c.slug} ${label}: 키워드/gloss 빈 값`);
      assert(k.domains.length >= 1, `${c.slug} ${label} "${k.word.ko}": 도메인 0개`);
    }
  }
});

const orientationCount = cards.length * 2;
const keywordTotal = cards.reduce(
  (n, c) => n + c.upright.keywords.length + c.reversed.keywords.length,
  0,
);
assert(orientationCount === 44, `방향 항목 ${orientationCount} ≠ 44`);
assert(keywordTotal === 222, `총 키워드 ${keywordTotal} ≠ 222 (20×5 + 전차 정 6 + 태양 역 6)`);

// mute 조합 (정보성 로그 — 검수용)
const DOMAIN_LIST = ["love", "work", "money", "relation", "self"];
const mutes = [];
for (const c of cards) {
  for (const [label, o] of [["정", c.upright], ["역", c.reversed]]) {
    for (const d of DOMAIN_LIST) {
      if (!o.keywords.some((k) => k.domains.includes(d))) mutes.push(`${c.slug}/${label}/${d}`);
    }
  }
}

const domainCounts = Object.fromEntries(DOMAIN_LIST.map((d) => [d, 0]));
for (const c of cards)
  for (const o of [c.upright, c.reversed])
    for (const k of o.keywords) for (const d of k.domains) domainCounts[d]++;

console.log(`✅ 카드 22 / 방향 44 / 키워드 ${keywordTotal}`);
console.log(`   도메인 분포: ${JSON.stringify(domainCounts)}`);
console.log(`   mute 조합 ${mutes.length}건: ${mutes.join(", ")}`);

// ---- 출력 ------------------------------------------------------------------

const banner = `// GENERATED FILE — app/tools/tarot/scripts/gen-cards.mjs 가
// app/tools/tarot/DICTIONARY.md (v0.3 동결, 2026-06-10)에서 생성.
//
// ⚠️ 편집장 검수 피드백은 이 파일에 직접 반영한다 (DICTIONARY.md는 스냅샷).
//    재생성(--force)하면 이 파일의 수정이 전부 덮어써진다.

import type { TarotCard } from "./types";

export const TAROT_CARDS: readonly TarotCard[] = `;

writeFileSync(OUT_PATH, banner + JSON.stringify(cards, null, 2) + ";\n", "utf8");
console.log(`✅ 생성 완료: ${OUT_PATH}`);
