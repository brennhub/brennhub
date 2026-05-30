// tag-it 명사 사전 생성 (1회성, 매 빌드 재실행 X — 산출물만 커밋).
//
// mecab-ko-dic 2.1.1 (Apache-2.0, © Eunjeon Project,
// https://bitbucket.org/eunjeon/mecab-ko-dic) 에서 일반명사(NNG) surface만 추출 →
// 한글 음절만 필터 → 중복 제거·정렬 → gzip → public/tag-it/noun-dict.txt.gz.
//
// 사용법 (mecab-ko-dic CSV 디렉토리 경로 전달):
//   node app/tools/tag-it/scripts/gen-noun-dict.mjs <mecab-ko-dic-dir>
// 사전 준비: tar 받기
//   curl -sL https://bitbucket.org/eunjeon/mecab-ko-dic/downloads/mecab-ko-dic-2.1.1-20180720.tar.gz | tar -xz
//
// 산출물(gzip)은 클라이언트가 fflate.gunzipSync로 해제 → Set lookup (보호 신호).

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const dir = process.argv[2];
if (!dir) {
  console.error("사용법: node gen-noun-dict.mjs <mecab-ko-dic CSV 디렉토리>");
  process.exit(1);
}

const HANGUL_ONLY = /^[가-힣]+$/;
const nouns = new Set();
let scanned = 0;

for (const f of readdirSync(dir)) {
  if (!f.endsWith(".csv")) continue;
  const text = readFileSync(join(dir, f), "utf8");
  for (const line of text.split("\n")) {
    if (!line) continue;
    const cols = line.split(",");
    // mecab-ko-dic CSV: surface,leftId,rightId,cost,POS,...
    if (cols[4] !== "NNG") continue;
    const surface = cols[0];
    if (HANGUL_ONLY.test(surface)) nouns.add(surface);
    scanned++;
  }
}

const sorted = [...nouns].sort();
const txt = sorted.join("\n");
const gz = gzipSync(Buffer.from(txt, "utf8"), { level: 9 });

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../../../../public/tag-it");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "noun-dict.txt.gz");
writeFileSync(out, gz);

console.log(`NNG 스캔 라인: ${scanned}`);
console.log(`고유 한글 명사: ${sorted.length}`);
console.log(`raw: ${(txt.length / 1048576).toFixed(2)}MB / gzip: ${(gz.length / 1048576).toFixed(2)}MB`);
console.log(`→ ${out}`);
