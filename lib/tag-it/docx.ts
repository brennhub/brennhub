/**
 * .docx 처리 (기획서 §2.2, task-prompt §3.1). 전부 브라우저 안 — 서버 전송 0.
 *
 * .docx = zip + XML. 읽기: zip 해제 → document.xml(본문/표) + core.xml(기존 keywords).
 * 쓰기: docProps/core.xml의 <cp:keywords>만 교체하고 **나머지 엔트리는 바이트 그대로 보존**.
 *       본문(document.xml)은 절대 건드리지 않는다 → "문서 손상" 경고 위험 최소화.
 *
 * 무결성 원칙: unzip이 돌려준 각 엔트리의 압축 해제 콘텐츠를 그대로 다시 zip에 넘긴다.
 * core.xml 한 엔트리만 새 Uint8Array로 교체. 경로·구조 전부 유지. (재압축은 정상 — Word도 저장 시 재압축)
 */

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { ExtractedText, ReadScope } from "./types";

const DOCUMENT_PATH = "word/document.xml";
const CORE_PATH = "docProps/core.xml";
const CONTENT_TYPES_PATH = "[Content_Types].xml";
const RELS_PATH = "_rels/.rels";

const CORE_CONTENT_TYPE =
  "application/vnd.openxmlformats-package.core-properties+xml";
const CORE_REL_TYPE =
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";

/** .docx 확장자 여부 (대소문자 무관). */
export function isDocxFile(name: string): boolean {
  return name.toLowerCase().endsWith(".docx");
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

/** XML 문자열에서 모든 <w:t>...</w:t> 텍스트를 뽑아 합친다. */
function extractRunText(xml: string): string {
  const matches = xml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
  if (!matches) return "";
  return matches
    .map((m) => m.replace(/<w:t\b[^>]*>/, "").replace(/<\/w:t>$/, ""))
    .map(decodeXml)
    .join(" ");
}

/**
 * document.xml에서 본문/표 텍스트를 분리 추출.
 * 표 = <w:tbl ...>...</w:tbl> 블록 (속성 테이블 <w:tblPr> 등은 "tbl" 뒤 글자가 있어 매치 안 됨).
 * 본문 = 표 블록을 제거한 나머지.
 */
function splitBodyAndTables(documentXml: string): ExtractedText {
  const TBL_RE = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
  const tableBlocks = documentXml.match(TBL_RE) ?? [];
  const tables = tableBlocks.map(extractRunText).join(" ");
  const bodyXml = documentXml.replace(TBL_RE, " ");
  const body = extractRunText(bodyXml);
  return { body, tables };
}

/** unzip 결과(엔트리 맵)를 캐시해 read·write가 공유. */
export type DocxEntries = Record<string, Uint8Array>;

export function unzipDocx(bytes: Uint8Array): DocxEntries {
  return unzipSync(bytes);
}

/** 본문/표 텍스트 추출. scope.body는 MVP에서 항상 true. */
export function readText(entries: DocxEntries, scope: ReadScope): ExtractedText {
  const docBytes = entries[DOCUMENT_PATH];
  if (!docBytes) return { body: "", tables: "" };
  const xml = strFromU8(docBytes);
  const { body, tables } = splitBodyAndTables(xml);
  return {
    body: scope.body ? body : "",
    tables: scope.tables ? tables : "",
  };
}

/** core.xml의 기존 keywords를 배열로. 없으면 빈 배열. */
export function readKeywords(entries: DocxEntries): string[] {
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
function registerCoreContentType(entries: DocxEntries): void {
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
function registerCoreRel(entries: DocxEntries): void {
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
 * keywords를 기록한 새 .docx 바이트를 반환.
 * core.xml만 교체 — 나머지 엔트리(특히 document.xml)는 unzip이 준 바이트 그대로 re-zip.
 */
export function writeKeywords(
  entries: DocxEntries,
  keywords: string[],
): Uint8Array {
  // 원본 엔트리를 얕은 복사 — 입력 맵 변형 방지
  const next: DocxEntries = { ...entries };

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
 * 여러 .docx를 하나의 .zip으로 묶는다 (일괄 다운로드용).
 * 각 .docx는 이미 압축된 zip이라 level 0(저장)으로 재압축 없이 담는다.
 * 파일명 충돌 시 " (n)" 접미사로 회피.
 */
export function zipFiles(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
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
