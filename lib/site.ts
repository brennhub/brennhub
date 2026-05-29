/**
 * 사이트 메타 상수. SEO / OG / sitemap / robots에서 공통 참조.
 * URL은 prod 기준 (sitemap·canonical용 절대 경로). dev preview에서는 page 자체가
 * dev.brennhub.com에 떠 있어도 sitemap은 prod URL을 가리킨다 (검색엔진 등록 대상은 prod).
 */

export const SITE_URL = "https://brennhub.com";
export const SITE_NAME = "BrennHub";
export const SITE_DESCRIPTION =
  "indie tools by brenn — small, sharp, opinionated.";
