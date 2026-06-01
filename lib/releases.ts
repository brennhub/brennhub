/**
 * 릴리스 노트 — 외부 사용자용 공개 항목.
 *
 * 기록 정책 (AGENTS.md §"릴리스 노트 기록"):
 *   - 시점: 도구가 main 머지로 prod 반영된 후
 *   - 무엇: 사용자 체감 신규/개선/수정만 (내부 리팩토링/빌드/인프라 제외)
 *   - 말투: 사용자 언어. 개발 용어(commit/refactor 등) 금지.
 *   - "AI"·"D1"·"스키마" 같은 구현 디테일 노출 X (BrennHub UI 원칙).
 *
 * 항목 추가만 하면 /releases 페이지에 자동 노출 (정렬은 페이지가 date desc로).
 * tool은 tools-registry slug 또는 "site"(도구 무관 전역 변경).
 */

export type ReleaseKind = "new" | "improved" | "fixed";

export type Release = {
  /**
   * 안정 매칭 키 (파일 ↔ D1 union의 join 키). 한 번 정한 후 변경 금지.
   * 변경 시 기존 admin 오버라이드/tombstone이 orphan화되어 silent 유실됨.
   * admin 직접 추가분은 nanoid 등으로 별도 생성.
   */
  id: string;
  /** YYYY-MM-DD — prod 반영일(main 머지일). */
  date: string;
  /** tools-registry slug 또는 "site"(전역). */
  tool: string;
  title: { ko: string; en: string };
  body: { ko: string; en: string };
  /** 미지정 시 페이지에서 배지 미렌더. */
  kind?: ReleaseKind;
};

export const releases: Release[] = [
  {
    id: "main-push-guardrails",
    date: "2026-06-02",
    tool: "site",
    kind: "improved",
    title: {
      ko: "배포 안전장치 강화",
      en: "Deploy guardrails strengthened",
    },
    body: {
      ko: "공식 배포 전에 미리 보기 환경에서 검증을 거쳤는지 시스템이 확인하도록 했습니다. 매주 올라오는 변경이 더 안정적으로 도착할 거예요.",
      en: "The system now verifies preview-environment checks before each production deploy. Weekly updates should land more reliably.",
    },
  },
  {
    id: "tool-likes-launch",
    date: "2026-06-01",
    tool: "site",
    kind: "new",
    title: {
      ko: "도구 좋아요",
      en: "Tool likes",
    },
    body: {
      ko: "도구 카드에서 좋아요를 누를 수 있습니다. 로그인 후 가능하고, 누른 만큼 다른 사람에게도 합산된 숫자가 보입니다.",
      en: "Like tools from the home card. Sign in to toggle — the combined count is visible to everyone.",
    },
  },
  {
    id: "shooter-launch",
    date: "2026-06-01",
    tool: "shooter",
    kind: "new",
    title: {
      ko: "아케이드 슈터 출시",
      en: "Arcade Shooter launched",
    },
    body: {
      ko: "키보드와 터치로 즐기는 픽셀 아케이드 슈터입니다. 5웨이브 + 난이도 선택 + 사운드.",
      en: "A pixel arcade shooter you can play with keyboard or touch. 5 waves, difficulty select, and sound.",
    },
  },
  {
    id: "profile-page",
    date: "2026-06-01",
    tool: "site",
    kind: "new",
    title: {
      ko: "프로필 페이지",
      en: "Profile page",
    },
    body: {
      ko: "표시 이름을 바꾸거나 계정을 삭제할 수 있는 프로필 페이지가 생겼습니다.",
      en: "A profile page where you can change your display name or delete your account.",
    },
  },
  {
    id: "hub-categories-favorites-search",
    date: "2026-06-01",
    tool: "site",
    kind: "improved",
    title: {
      ko: "메인 페이지 — 카테고리·즐겨찾기·검색",
      en: "Home — categories, favorites, search",
    },
    body: {
      ko: "도구들을 분야별로 묶고, 별표로 즐겨찾기에 담고, 이름으로 빠르게 찾을 수 있습니다. 도구 화면 우하단 별로도 즐겨찾기 토글이 가능합니다.",
      en: "Tools are grouped by category, you can star them as favorites, and search by name. Toggle favorites from any tool's bottom-right star too.",
    },
  },
  {
    id: "tag-it-launch",
    date: "2026-05-29",
    tool: "tag-it",
    kind: "new",
    title: {
      ko: "Tag-it 출시",
      en: "Tag-it launched",
    },
    body: {
      ko: ".docx 문서에 키워드를 달아주는 도구입니다.",
      en: "Tags keywords in .docx documents.",
    },
  },
  {
    id: "d1-device-sync",
    date: "2026-05-28",
    tool: "site",
    kind: "new",
    title: {
      ko: "로그인 시 도구 데이터 기기 간 동기화",
      en: "Tool data syncs across devices when signed in",
    },
    body: {
      ko: "로그인하면 영양제 스케줄, 미로, 글리프, 주식 계산기 입력값이 기기 간에 그대로 유지됩니다.",
      en: "Signed-in users keep their supplement schedules, mazes, glyphs, and stock calculator inputs across devices.",
    },
  },
  {
    id: "google-auth-profile",
    date: "2026-05-26",
    tool: "site",
    kind: "new",
    title: {
      ko: "Google 로그인 + 프로필",
      en: "Google sign-in + profile",
    },
    body: {
      ko: "Google 계정으로 로그인하고, 표시 이름을 변경하거나 계정을 삭제할 수 있습니다.",
      en: "Sign in with Google, change your display name, or delete your account.",
    },
  },
  {
    id: "maze-launch",
    date: "2026-05-22",
    tool: "maze",
    kind: "new",
    title: {
      ko: "픽셀 미로 만들기 출시",
      en: "Pixel Maze launched",
    },
    body: {
      ko: "직접 그린 미로를 플레이하고, 공유 링크로 친구에게 전달할 수 있습니다.",
      en: "Draw a maze, play it, and share it with friends via a short link.",
    },
  },
  {
    id: "language-maker-launch",
    date: "2026-05-21",
    tool: "language-maker",
    kind: "new",
    title: {
      ko: "언어 창조기 출시",
      en: "Language Maker launched",
    },
    body: {
      ko: "16×16 픽셀 글리프로 나만의 문자 체계를 만들고 입력해볼 수 있습니다.",
      en: "Design your own writing system with 16×16 pixel glyphs and type with them.",
    },
  },
  {
    id: "supp-plan-launch",
    date: "2026-05-17",
    tool: "supp-plan",
    kind: "new",
    title: {
      ko: "영양제 플래너 출시",
      en: "Supplement Planner launched",
    },
    body: {
      ko: "약물동력학을 고려해 개인 영양제 복용 스케줄을 설계합니다.",
      en: "Plan a personal supplement schedule with pharmacokinetics in mind.",
    },
  },
  {
    id: "stock-sim-launch",
    date: "2026-05-14",
    tool: "stock-sim",
    kind: "new",
    title: {
      ko: "주식 시뮬레이터 출시",
      en: "Stock Simulator launched",
    },
    body: {
      ko: "분할매수·분할매도·평단가·배당 네 가지 계산을 한 곳에서 다룹니다.",
      en: "Cost basis, dollar-cost-averaging, split-sell, and dividend calculators in one place.",
    },
  },
  {
    id: "cron-trans-launch",
    date: "2026-05-12",
    tool: "cron-trans",
    kind: "new",
    title: {
      ko: "Cron 변환기 출시",
      en: "Cron Converter launched",
    },
    body: {
      ko: "cron 식과 자연어를 양방향으로 변환합니다.",
      en: "Convert between cron expressions and plain English.",
    },
  },
  {
    id: "email-diag-launch",
    date: "2026-05-12",
    tool: "email-diag",
    kind: "new",
    title: {
      ko: "이메일 발송 진단기 출시",
      en: "Email Sender Diagnostics launched",
    },
    body: {
      ko: "도메인의 SPF·DMARC·MX 설정을 한 번에 점검합니다.",
      en: "Check a domain's SPF, DMARC, and MX setup at a glance.",
    },
  },
];
