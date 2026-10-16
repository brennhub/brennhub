/**
 * Cowork export 묶음 (순수) — DoC에서 받은 공개 원문과 오퍼 키만. 내 표시·메모·계좌 정보는 절대 싣지 않는다.
 *
 * 기본: 지금 할 만한 오퍼 + 관심(⭐) 오퍼 중 상세 글을 받았고(HTTP 2xx), 대상 필드(TARGET_FIELDS)가 하나라도 빈 것.
 * all=true: 상세 글을 받은 모든 오퍼. 둘 다 보너스 큰 순 최대 60건, 약관 원문 6000자 상한.
 * (관심 표시는 대상 선정에만 쓰고 응답에는 어떤 표시도 남기지 않는다.)
 */

import { COWORK } from "./config";
import { EXTRACT_FIELDS, TARGET_FIELDS } from "./evidence";
import { byBonus } from "./offers";
import type { EvaluatedOffer, OfferDetail } from "./types";

export type ExportItem = {
  offer_key: string;
  bank: string | null;
  detail_url: string | null;
  missing: string[];
  glance_text: string | null;
  fine_print_text: string | null;
};

export type ExportPayload = { generatedAt: string; items: ExportItem[] };

const fetchedOk = (d: OfferDetail | undefined): d is OfferDetail =>
  !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;

export function buildExport(all: EvaluatedOffer[], details: Map<string, OfferDetail>, includeAll: boolean, now = new Date()): ExportPayload {
  const items = all
    .filter((o) => fetchedOk(details.get(o.key)))
    .filter((o) => includeAll || ((o.doable || !!o.flags.star) && TARGET_FIELDS.some((f) => details.get(o.key)![f] == null)))
    .sort(byBonus)
    .slice(0, COWORK.exportMaxItems)
    .map((o): ExportItem => {
      const d = details.get(o.key)!;
      return {
        offer_key: o.key,
        bank: o.bank,
        detail_url: d.detail_url,
        missing: EXTRACT_FIELDS.filter((f) => d[f] == null),
        glance_text: d.glance_text,
        fine_print_text: d.fine_print_text ? d.fine_print_text.slice(0, COWORK.exportTextMax) : null,
      };
    });
  return { generatedAt: now.toISOString(), items };
}
