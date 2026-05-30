/**
 * 오피스 문서(OOXML) 처리 — .docx / .xlsx / .pptx. 전부 브라우저 안, 서버 전송 0.
 *
 * OOXML = zip + XML. 세 포맷 모두 `docProps/core.xml`의 <cp:keywords> 위치가 동일 →
 * keywords 읽기·쓰기·재포장은 **포맷 무관 공유**. 포맷별로 다른 건 **본문 텍스트 추출**뿐.
 *
 * 무결성 원칙: unzip이 돌려준 각 엔트리의 압축 해제 콘텐츠를 그대로 다시 zip에 넘긴다.
 * core.xml 한 엔트리만 새 Uint8Array로 교체 — 본문 XML(word/document·xl/*·ppt/slides/*)은
 * 절대 건드리지 않는다 → "문서 손상" 경고 위험 최소화. (재압축은 정상 — Office도 저장 시 재압축)
 */

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { ExtractedText, ReadScope } from "./types";

const CORE_PATH = "docProps/core.xml";
const CONTENT_TYPES_PATH = "[Content_Types].xml";
const RELS_PATH = "_rels/.rels";
const DOCUMENT_PATH = "word/document.xml";
const SHARED_STRINGS_PATH = "xl/sharedStrings.xml";

const CORE_CONTENT_TYPE =
  "application/vnd.openxmlformats-package.core-properties+xml";
const CORE_REL_TYPE =
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";

export type OfficeFormat = "docx" | "xlsx" | "pptx";

/** 다운로드 시 포맷별 MIME (확장자·파일명은 원본 유지). */
export const MIME_BY_FORMAT: Record<OfficeFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXT_FORMAT: Record<string, OfficeFormat> = {
  ".docx": "docx",
  ".xlsx": "xlsx",
  ".pptx": "pptx",
};

/** 확장자로 포맷 판별 (대소문자 무관). 미지원이면 null. */
export function detectFormat(name: string): OfficeFormat | null {
  const lower = name.toLowerCase();
  for (const ext in EXT_FORMAT) {
    if (lower.endsWith(ext)) return EXT_FORMAT[ext];
  }
  return null;
}

/** 지원 오피스 문서 여부 (.docx/.xlsx/.pptx). */
export function isOfficeFile(name: string): boolean {
  return detectFormat(name) !== null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** XML에서 특정 태그(<w:t>/<a:t>/<t>)의 텍스트를 모두 뽑아 공백으로 합친다. */
function extractByTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(decodeXml(m[1]));
  return out.join(" ");
}

/** 자연 정렬용: "...slide12.xml" → 12. 없으면 0. */
function numberIn(path: string): number {
  const m = path.match(/(\d+)\.xml$/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

// ── 포맷별 본문 추출 ────────────────────────────────────────────────

/** docx: document.xml에서 본문/표 분리 (<w:t>, <w:tbl> 블록). */
function readDocxText(entries: OfficeEntries, scope: ReadScope): ExtractedText {
  const docBytes = entries[DOCUMENT_PATH];
  if (!docBytes) return { body: "", tables: "" };
  const xml = strFromU8(docBytes);
  const TBL_RE = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  const tableBlocks = xml.match(TBL_RE) ?? [];
  const tables = tableBlocks.map((b) => extractByTag(b, "w:t")).join(" ");
  const bodyXml = xml.replace(TBL_RE, " ");
  const body = extractByTag(bodyXml, "w:t");
  return {
    body: scope.body ? body : "",
    tables: scope.tables ? tables : "",
  };
}

/**
 * xlsx: xl/sharedStrings.xml의 <t> (셀 공유 문자열) + 시트 inline string(<is><t>).
 * ⚠️ 빈도는 sharedStrings 기준(고유 문자열 1회) — 실제 셀 등장 횟수와 다를 수 있다.
 *    셀 인덱스 참조까지 세는 무거운 처리는 안 함 (MVP, 사용자가 칩 선택). tables는 빈 값.
 */
function readXlsxText(entries: OfficeEntries): ExtractedText {
  const parts: string[] = [];
  const ssBytes = entries[SHARED_STRINGS_PATH];
  if (ssBytes) {
    // 한국어/한자 phonetic 힌트(<rPh>)는 후리가나 노이즈라 제거 후 추출.
    const xml = strFromU8(ssBytes).replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
    parts.push(extractByTag(xml, "t"));
  }
  // inline string: <c t="inlineStr"><is><t>...</t></is>. 시트별 <is> 블록의 <t>.
  for (const path of Object.keys(entries)) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) continue;
    const xml = strFromU8(entries[path]);
    const isBlocks = xml.match(/<is>[\s\S]*?<\/is>/g);
    if (isBlocks) parts.push(extractByTag(isBlocks.join(" "), "t"));
  }
  return { body: parts.join(" "), tables: "" };
}

/**
 * pptx: ppt/slides/slideN.xml 순회, <a:t> 텍스트. 슬라이드 번호 자연 정렬(slide2 < slide10).
 * 노트(notesSlide)·머리/바닥글 제외 (BACKLOG). tables는 빈 값.
 */
function readPptxText(entries: OfficeEntries): ExtractedText {
  const slides = Object.keys(entries)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => numberIn(a) - numberIn(b));
  const body = slides
    .map((p) => extractByTag(strFromU8(entries[p]), "a:t"))
    .join(" ");
  return { body, tables: "" };
}

// ── 공유 (포맷 무관) ────────────────────────────────────────────────

/** unzip 결과(엔트리 맵)를 캐시해 read·write가 공유. */
export type OfficeEntries = Record<string, Uint8Array>;

export function unzipOffice(bytes: Uint8Array): OfficeEntries {
  return unzipSync(bytes);
}

/** 본문 텍스트 추출 — 포맷별 디스패치. scope.body는 MVP에서 항상 true. */
export function readText(
  entries: OfficeEntries,
  format: OfficeFormat,
  scope: ReadScope,
): ExtractedText {
  switch (format) {
    case "docx":
      return readDocxText(entries, scope);
    case "xlsx":
      return readXlsxText(entries);
    case "pptx":
      return readPptxText(entries);
  }
}

/** core.xml의 기존 keywords를 배열로. 없으면 빈 배열. (세 포맷 동일) */
export function readKeywords(entries: OfficeEntries): string[] {
  const coreBytes = entries[CORE_PATH];
  if (!coreBytes) return [];
  const xml = strFromU8(coreBytes);
  const m = xml.match(/<cp:keywords\b[^>]*>([\s\S]*?)<\/cp:keywords>/);
  if (!m) return [];
  return decodeXml(m[1])
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** core.xml 문자열에 keywords를 set (있으면 교체, 없으면 삽입). */
function setKeywordsInCore(coreXml: string, keywords: string[]): string {
  const inner = escapeXml(keywords.join(", "));
  const replacement = `<cp:keywords>${inner}</cp:keywords>`;
  const existing =
    /<cp:keywords\b[^>]*>[\s\S]*?<\/cp:keywords>|<cp:keywords\b[^>]*\/>/;
  if (existing.test(coreXml)) {
    return coreXml.replace(existing, replacement);
  }
  if (coreXml.includes("</cp:coreProperties>")) {
    return coreXml.replace(
      "</cp:coreProperties>",
      `${replacement}</cp:coreProperties>`,
    );
  }
  return coreXml; // 예상 밖 구조 — 원형 유지 (손상 방지)
}

function buildCoreXml(keywords: string[]): string {
  const inner = escapeXml(keywords.join(", "));
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<cp:keywords>${inner}</cp:keywords>` +
    "</cp:coreProperties>"
  );
}

/** core.xml을 새로 만들 때만: [Content_Types].xml에 Override 등록 (이미 있으면 무시). */
function registerCoreContentType(entries: OfficeEntries): void {
  const bytes = entries[CONTENT_TYPES_PATH];
  if (!bytes) return;
  let xml = strFromU8(bytes);
  if (xml.includes('PartName="/docProps/core.xml"')) return;
  const override = `<Override PartName="/docProps/core.xml" ContentType="${CORE_CONTENT_TYPE}"/>`;
  if (xml.includes("</Types>")) {
    xml = xml.replace("</Types>", `${override}</Types>`);
    entries[CONTENT_TYPES_PATH] = strToU8(xml);
  }
}

/** core.xml을 새로 만들 때만: _rels/.rels에 관계 등록 (이미 있으면 무시). */
function registerCoreRel(entries: OfficeEntries): void {
  const bytes = entries[RELS_PATH];
  if (!bytes) return;
  let xml = strFromU8(bytes);
  if (xml.includes(CORE_REL_TYPE)) return;
  const rel = `<Relationship Id="rIdCoreProps" Type="${CORE_REL_TYPE}" Target="docProps/core.xml"/>`;
  if (xml.includes("</Relationships>")) {
    xml = xml.replace("</Relationships>", `${rel}</Relationships>`);
    entries[RELS_PATH] = strToU8(xml);
  }
}

/**
 * keywords를 기록한 새 오피스 문서 바이트를 반환. (세 포맷 동일 경로)
 * core.xml만 교체 — 나머지 엔트리(본문 XML 포함)는 unzip이 준 바이트 그대로 re-zip.
 */
export function writeKeywords(
  entries: OfficeEntries,
  keywords: string[],
): Uint8Array {
  // 원본 엔트리를 얕은 복사 — 입력 맵 변형 방지
  const next: OfficeEntries = { ...entries };

  const coreBytes = next[CORE_PATH];
  if (coreBytes) {
    const updated = setKeywordsInCore(strFromU8(coreBytes), keywords);
    next[CORE_PATH] = strToU8(updated);
  } else {
    next[CORE_PATH] = strToU8(buildCoreXml(keywords));
    registerCoreContentType(next);
    registerCoreRel(next);
  }

  return zipSync(next);
}

/**
 * 여러 오피스 문서를 하나의 .zip으로 묶는다 (일괄 다운로드용).
 * 각 문서는 이미 압축된 zip이라 level 0(저장)으로 재압축 없이 담는다.
 * 파일명 충돌 시 " (n)" 접미사로 회피.
 */
export function zipFiles(
  files: { name: string; bytes: Uint8Array }[],
): Uint8Array {
  const out: Record<string, [Uint8Array, { level: 0 }]> = {};
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      let i = 1;
      while (used.has(`${base} (${i})${ext}`)) i += 1;
      name = `${base} (${i})${ext}`;
    }
    used.add(name);
    out[name] = [f.bytes, { level: 0 }];
  }
  return zipSync(out);
}
