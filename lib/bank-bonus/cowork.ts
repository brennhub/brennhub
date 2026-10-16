/**
 * Cowork 추출 파일 반영 (ingest).
 *
 * 파이프라인: GET /api/bank-bonus/export → Cowork 예약 작업이 DoC 원문에서 값 + 근거 인용을 뽑아
 * data/bank-bonus/extractions.json에 커밋 → dev 배포 → refresh가 이 파일을 읽어 근거 대조(evidence.ts) 후 반영.
 *
 * 파일은 빌드 시점 import — OpenNext가 Worker 번들에 넣는다. 파일이 바뀌면 다음 배포부터 반영된다.
 * 규칙: 비어 있는 칸만 채운다. 정규식·DoC 처닝 목록·공식·직접 입력 값은 덮지 않는다 (덮는 칸이면 건너뜀으로 센다).
 */

import extractionsFile from "@/data/bank-bonus/extractions.json";
import { applyCoworkResult, listDetails } from "./db";
import { EXTRACT_FIELDS, checkEvidence, sourceText, type ExtractValues, type GateReason } from "./evidence";

export type ExtractionItem = {
  offer_key: string;
  source_url?: string | null;
  fields: ExtractValues;
  evidence: Record<string, string | null | undefined>;
};

export type ExtractionFile = { version: 1; generatedAt: string | null; items: ExtractionItem[] };

export type RejectReason = GateReason | "unknown_offer";

export type CoworkSummary = {
  fileGeneratedAt: string | null;
  items: number;
  accepted: number;
  rejected: Record<RejectReason, number>;
  /** 이미 값이 있어 건너뛴 필드 (정규식 등이 먼저 채움, 또는 이전 반영분). */
  skippedExisting: number;
};

/** 번들된 파일 → 형식 확인. 모양이 다르면 빈 파일로 본다 (refresh는 실패하지 않음). */
export function loadExtractionFile(raw: unknown = extractionsFile): ExtractionFile {
  const f = raw as Partial<ExtractionFile> | null;
  if (!f || f.version !== 1 || !Array.isArray(f.items)) return { version: 1, generatedAt: null, items: [] };
  const items = f.items.filter(
    (it): it is ExtractionItem =>
      !!it && typeof it.offer_key === "string" && typeof it.fields === "object" && it.fields !== null && typeof it.evidence === "object" && it.evidence !== null,
  );
  return { version: 1, generatedAt: typeof f.generatedAt === "string" ? f.generatedAt : null, items };
}

export async function coworkIngest(db: D1Database, file: ExtractionFile = loadExtractionFile()): Promise<CoworkSummary> {
  const out: CoworkSummary = {
    fileGeneratedAt: file.generatedAt,
    items: file.items.length,
    accepted: 0,
    rejected: { no_evidence: 0, quote_not_found: 0, value_not_in_quote: 0, unknown_offer: 0 },
    skippedExisting: 0,
  };
  if (!file.items.length) return out;

  const details = await listDetails(db);
  const now = new Date().toISOString();

  for (const item of file.items) {
    const d = details.get(item.offer_key);
    const haystack = d ? sourceText(d.glance_text, d.fine_print_text) : "";
    if (!d || !haystack.trim()) {
      out.rejected.unknown_offer++;
      continue;
    }
    const values: ExtractValues = {};
    const quotes: Record<string, string> = {};
    for (const field of EXTRACT_FIELDS) {
      const value = item.fields[field];
      if (value == null || (Array.isArray(value) && !value.length)) continue; // 파일도 값 없음 — 판정 대상 아님
      if ((d as Record<string, unknown>)[field] != null) {
        out.skippedExisting++;
        continue;
      }
      const r = checkEvidence(field, value, item.evidence[field], haystack);
      if (!r.ok) {
        out.rejected[r.reason]++;
        continue;
      }
      (values as Record<string, unknown>)[field] = value;
      quotes[field] = r.quote;
      out.accepted++;
    }
    if (values.churn_months != null) values.churn_text = (item.fields.churn_text ?? quotes.churn_months ?? "").slice(0, 500) || null;
    if (Object.keys(quotes).length) await applyCoworkResult(db, item.offer_key, d.evidence ?? {}, values, quotes, now);
  }
  return out;
}
