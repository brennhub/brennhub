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
  OFFICIAL_ONLY,
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
  /** (선택) 같은 키의 한국어 번역 — evidence_ko.requirements는 단계 순서대로. 게이트는 영어 인용만 본다. */
  evidence: Record<string, string | (string | null)[] | null | undefined>;
  evidence_ko?: Record<string, string | (string | null)[] | null | undefined>;
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
    const docQuotes: Record<string, { quote: string; quote_ko: string | null; url: string | null }> = {};
    const officialFields: OfficialFields = { ...(d.official_fields ?? {}) };
    const ko = item.evidence_ko ?? {};
    let officialChanged = false;

    // 이미 있는 값: 정규식 등 다른 출처면 건너뜀. 이전 Cowork 반영분이면 새 파일 값·번역으로 갱신한다.
    const accept = (field: string, value: unknown, quote: string, source: "official" | "doc_post", quoteKo: string | null) => {
      if (source === "official") {
        const prev = officialFields[field];
        if (prev && prev.method !== "cowork") return out.skippedExisting++;
        officialFields[field] = { value, quote, method: "cowork", quote_ko: quoteKo };
        officialChanged = true;
        out.acceptedOfficial++;
      } else {
        const filled = (d as Record<string, unknown>)[FIELD_COLUMN[field as keyof typeof FIELD_COLUMN] ?? field] != null;
        if (filled && d.evidence?.[field]?.method !== "cowork") return out.skippedExisting++;
        (docValues as Record<string, unknown>)[field] = value;
        docQuotes[field] = { quote, quote_ko: quoteKo, url: d.detail_url };
      }
      out.accepted++;
    };

    for (const field of EXTRACT_FIELDS) {
      const value = item.fields[field];
      if (value == null || (Array.isArray(value) && !value.length)) continue; // 파일도 값 없음 — 판정 대상 아님
      if (field === "requirements") {
        const n = (value as unknown[]).length;
        const r = checkRequirements(value, stepQuotes(item.evidence, n), hay, stepQuotes(ko, n));
        if (!r.ok) out.rejected[r.reason]++;
        else accept("requirements", r.steps, r.steps[0].quote ?? "", r.source, r.steps[0].quote_ko ?? null);
        continue;
      }
      const r = checkEvidence(field as ScalarField, value, asQuote(item.evidence[field]), hay);
      if (!r.ok) {
        out.rejected[r.reason]++;
        continue;
      }
      // 공식 금액은 공식 본문에서 확인될 때만 — DoC 원문에서만 찾은 인용은 버린다.
      if (OFFICIAL_ONLY.has(field) && r.source !== "official") {
        out.rejected.quote_not_found++;
        continue;
      }
      accept(field, value, r.quote, r.source, asQuote(ko[field])?.trim().slice(0, 500) || null);
      if (field === "churn_months") {
        const text = (item.fields.churn_text ?? r.quote).slice(0, 500);
        if (r.source === "official" && officialFields.churn_months) officialFields.churn_text = { value: text, quote: r.quote, method: "cowork", quote_ko: asQuote(ko.churn_months) };
        else if (docValues.churn_months != null) docValues.churn_text = text;
      }
      if (field === "ach_push" && r.source === "doc_post" && docValues.ach_push != null) docValues.ach_push_text = r.quote;
    }

    if (Object.keys(docQuotes).length) await applyCoworkResult(db, item.offer_key, d.evidence ?? {}, docValues, docQuotes, now);
    if (officialChanged) await saveOfficialFields(db, item.offer_key, officialFields, now, true);
  }
  return out;
}
