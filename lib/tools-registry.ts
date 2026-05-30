export type ToolStatus = "live" | "coming-soon";

export type Tool = {
  id: string;
  slug: string;
  status: ToolStatus;
  createdAt: string;
  /**
   * 전용 `app/tools/<slug>/page.tsx`가 존재하는지 여부.
   * true면 `[slug]` fallback이 해당 슬러그를 정적 경로로 emit하지 않는다
   * (전용 페이지와 `[slug]`가 같은 라우트를 emit하는 collision 방지).
   * status가 아직 "coming-soon"이어도 전용 페이지를 먼저 둘 때 사용.
   */
  hasPage?: boolean;
};

export const tools: Tool[] = [
  {
    id: "email-diag",
    slug: "email-diag",
    status: "live",
    createdAt: "2026-05-12",
  },
  {
    id: "cron-trans",
    slug: "cron-trans",
    status: "live",
    createdAt: "2026-05-12",
  },
  {
    id: "stock-sim",
    slug: "stock-sim",
    status: "live",
    createdAt: "2026-05-14",
  },
  {
    id: "supp-plan",
    slug: "supp-plan",
    status: "live",
    createdAt: "2026-05-17",
  },
  {
    id: "saju-naming",
    slug: "saju-naming",
    status: "live",
    createdAt: "2026-05-19",
  },
  {
    id: "lineup-builder",
    slug: "lineup-builder",
    status: "live",
    createdAt: "2026-05-19",
  },
  {
    id: "language-maker",
    slug: "language-maker",
    status: "live",
    createdAt: "2026-05-21",
  },
  {
    id: "maze",
    slug: "maze",
    status: "live",
    createdAt: "2026-05-22",
    // 0.14.0(P4a)에서 D1·숏링크 + 1.0.0(P4b)에서 STAR_THRESHOLDS 보정·라이브 전환.
    // hasPage: live 후에도 [slug] fallback 충돌 방지로 유지 (P2 결정 명문화).
    hasPage: true,
  },
  {
    id: "tag-it",
    slug: "tag-it",
    status: "live",
    createdAt: "2026-05-29",
    // 클라이언트 전용 도구 (D1·서버 없음). hasPage: [slug] fallback 충돌 방지.
    hasPage: true,
  },
];
