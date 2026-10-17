/**
 * Cowork 추출 파일 반영 (ingest).
 *
 * 파이프라인: GET /api/bank-bonus/export → (Action) bb-data/pending.json → Cowork가 공식 약관·DoC 원문에서 값 + 근거 인용을 뽑아
 * data/bank-bonus/extractions.json에 커밋 → dev 배포 → refresh가 이 파일을 읽어 근거 대조(evidence.ts) 후 반영.
 *
 * 파일은 빌드 시점 import — OpenNext가 Worker 번들에 넣는다. 파일이 바뀌면 다음 배포부터 반영된다.
 * 인용이 공식 본문에서 확인되면 official_fields(표시 우선), DoC 원문에서 확인되면 상세 칸(비어 있을 때만).
 * 이미 값이 있는 칸은 덮지 않고 skippedExisting으로 센다.
 */

import extractionsFile from "@/data/bank-bonus/extractions.json";
import { applyCoworkResult, listDetails, listOfficialPages, saveOfficialFields } from "./db";
import {
  EXTRACT_FIELDS,
  FIELD_COLUMN,
  checkEvidence,
  checkRequirements,
  sourceText,
  type ExtractValues,
  type GateReason,
  type ScalarField,
} from "./evidence";
import type { OfficialFields } from "./types";

export type ExtractionItem = {
  offer_key: string;
  source_url?: string | null;
  fields: ExtractValues;
  /** 단일 값 필드마다 인용 1개, requirements는 단계별 인용 배열(또는 "requirements.N" 키, 또는 단계의 quote). */
  evidence: Record<string, string | (string | null)[] | null | undefined>;
};

export type ExtractionFile = { version: 1; generatedAt: string | null; items: ExtractionItem[] };

export type RejectReason = GateReason | "unknown_offer";

export type CoworkSummary = {
  fileGeneratedAt: string | null;
  items: number;
  accepted: number;
  /** 근거가 공식 본문에서 확인된 채택 수 (accepted에 포함). */
  acceptedOfficial: number;
  rejected: Record<RejectReason, number>;
  /** 이미 값이 있어 건너뛴 필드 (정규식·이전 반영분). */
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

const asQuote = (v: unknown): string | null => (typeof v === "string" ? v : null);

function stepQuotes(ev: ExtractionItem["evidence"], n: number): (string | null)[] {
  const arr = ev.requirements;
  if (Array.isArray(arr)) return arr.map(asQuote);
  return Array.from({ length: n }, (_, i) => asQuote(ev[`requirements.${i + 1}`]));
}

export async function coworkIngest(db: D1Database, file: ExtractionFile = loadExtractionFile()): Promise<CoworkSummary> {
  const out: CoworkSummary = {
    fileGeneratedAt: file.generatedAt,
    items: file.items.length,
    accepted: 0,
    acceptedOfficial: 0,
    rejected: { no_evidence: 0, quote_not_found: 0, value_not_in_quote: 0, unknown_offer: 0 },
    skippedExisting: 0,
  };
  if (!file.items.length) return out;

  const [details, pages] = await Promise.all([listDetails(db), listOfficialPages(db)]);
  const now = new Date().toISOString();

  for (const item of file.items) {
    const d = details.get(item.offer_key);
    const doc = d ? sourceText(d.glance_text, d.fine_print_text) : "";
    const official = pages.get(item.offer_key)?.text ?? null;
    if (!d || (!doc.trim() && !official)) {
      out.rejected.unknown_offer++;
      continue;
    }
    const hay = { official, doc: doc.trim() ? doc : null };
    const docValues: ExtractValues = {};
    const docQuotes: Record<string, string> = {};
    const officialFields: OfficialFields = { ...(d.official_fields ?? {}) };
    let officialChanged = false;

    const accept = (field: string, value: unknown, quote: string, source: "official" | "doc_post") => {
      if (source === "official") {
        if (officialFields[field]) return out.skippedExisting++;
        officialFields[field] = { value, quote, method: "cowork" };
        officialChanged = true;
        out.acceptedOfficial++;
      } else {
        if ((d as Record<string, unknown>)[FIELD_COLUMN[field as keyof typeof FIELD_COLUMN] ?? field] != null) return out.skippedExisting++;
        (docValues as Record<string, unknown>)[field] = value;
        docQuotes[field] = quote;
      }
      out.accepted++;
    };

    for (const field of EXTRACT_FIELDS) {
      const value = item.fields[field];
      if (value == null || (Array.isArray(value) && !value.length)) continue; // 파일도 값 없음 — 판정 대상 아님
      if (field === "requirements") {
        const r = checkRequirements(value, stepQuotes(item.evidence, (value as unknown[]).length), hay);
        if (!r.ok) out.rejected[r.reason]++;
        else accept("requirements", r.steps, r.steps[0].quote ?? "", r.source);
        continue;
      }
      const r = checkEvidence(field as ScalarField, value, asQuote(item.evidence[field]), hay);
      if (!r.ok) {
        out.rejected[r.reason]++;
        continue;
      }
      accept(field, value, r.quote, r.source);
      if (field === "churn_months") {
        const text = (item.fields.churn_text ?? r.quote).slice(0, 500);
        if (r.source === "official" && officialFields.churn_months) officialFields.churn_text = { value: text, quote: r.quote, method: "cowork" };
        else if (docValues.churn_months != null) docValues.churn_text = text;
      }
      if (field === "ach_push" && r.source === "doc_post" && docValues.ach_push != null) docValues.ach_push_text = r.quote;
    }

    if (Object.keys(docQuotes).length) await applyCoworkResult(db, item.offer_key, d.evidence ?? {}, docValues, docQuotes, now);
    if (officialChanged) await saveOfficialFields(db, item.offer_key, officialFields, now, true);
  }
  return out;
}
