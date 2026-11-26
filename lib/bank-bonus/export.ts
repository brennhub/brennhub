/**
 * Cowork export 묶음 (순수) — DoC·은행 공식 페이지에서 받은 공개 원문과 오퍼 키만. 내 표시·메모·계좌 정보는 절대 싣지 않는다.
 *
 * 기본: 지금 할 만한 오퍼 + 관심(⭐) 오퍼 중 상세 글을 받았고(HTTP 2xx), 대상 필드(TARGET_FIELDS)가 하나라도 빈 것.
 * all=true: 상세 글을 받은 모든 오퍼. 둘 다 보너스 큰 순 최대 60건, DoC 약관 6000자 · 공식 본문 24000자 상한.
 * (관심 표시는 대상 선정에만 쓰고 응답에는 어떤 표시도 남기지 않는다.)
 */

import { COWORK } from "./config";
import { EXTRACT_FIELDS, FIELD_COLUMN, TARGET_FIELDS } from "./evidence";
import { OFFICIAL_TEXT_MAX } from "./official";
import { byBonus } from "./offers";
import type { EvaluatedOffer, OfferDetail, OfficialPage } from "./types";

export type ExportItem = {
  offer_key: string;
  bank: string | null;
  detail_url: string | null;
  /** 아직 값이 없는 추출 필드 (DoC 칸과 공식 값 둘 다 빈 것). */
  missing: string[];
  glance_text: string | null;
  fine_print_text: string | null;
  official_url: string | null;
  /** 공식 페이지 HTTP 상태 (못 받았으면 null). */
  official_status: number | null;
  /** 쓸 만한 본문일 때만 — 막힘·스크립트 페이지는 null. */
  official_text: string | null;
};

export type ExportPayload = { generatedAt: string; items: ExportItem[] };

const fetchedOk = (d: OfferDetail | undefined): d is OfferDetail =>
  !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;

const hasValue = (d: OfferDetail, field: string) =>
  (d as Record<string, unknown>)[FIELD_COLUMN[field as keyof typeof FIELD_COLUMN] ?? field] != null || !!d.official_fields?.[field];

export function buildExport(
  all: EvaluatedOffer[],
  details: Map<string, OfferDetail>,
  pages: Map<string, OfficialPage>,
  includeAll: boolean,
  now = new Date(),
): ExportPayload {
  const items = all
    .filter((o) => fetchedOk(details.get(o.key)))
    .filter((o) => includeAll || ((o.doable || !!o.flags.star) && TARGET_FIELDS.some((f) => !hasValue(details.get(o.key)!, f))))
    .sort(byBonus)
    .slice(0, COWORK.exportMaxItems)
    .map((o): ExportItem => {
      const d = details.get(o.key)!;
      const page = pages.get(o.key);
      return {
        offer_key: o.key,
        bank: o.bank,
        detail_url: d.detail_url,
        missing: EXTRACT_FIELDS.filter((f) => !hasValue(d, f)),
        glance_text: d.glance_text,
        fine_print_text: d.fine_print_text ? d.fine_print_text.slice(0, COWORK.exportTextMax) : null,
        official_url: page?.url ?? d.bank_offer_url,
        official_status: page?.http_status ?? null,
        official_text: page?.text ? page.text.slice(0, OFFICIAL_TEXT_MAX) : null,
      };
    });
  return { generatedAt: now.toISOString(), items };
}
