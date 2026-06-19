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
    id: "tarot-copy-image-button",
    date: "2026-06-19",
    tool: "tarot",
    kind: "improved",
    title: {
      ko: "타로 테이블 — 리딩 이미지 복사 버튼",
      en: "Tarot Table — copy the reading image",
    },
    body: {
      ko: "결과 화면에 [이미지 복사] 버튼이 공유·새 리딩 버튼과 나란히 생겼어요. 누르면 리딩 이미지가 곧바로 복사되어, 메신저 대화창이나 메모 어디든 그 자리에서 붙여넣을 수 있습니다. [이미지로 공유]는 그대로 따로 있으니, 보내고 싶을 땐 공유, 손에 쥐고 다른 곳에 옮기고 싶을 땐 복사로 골라 쓰세요. 시작 전 숨을 고르는 화면의 어둠도 큰 화면에서 좌우 끝까지 가득 차도록 다듬었습니다.",
      en: "A [Copy image] button now sits beside the share and new-reading buttons on the result screen. Press it and the reading image is copied right away, ready to paste straight into a chat or a note. [Share image] stays where it was, on its own — share when you want to send it, copy when you want to carry it somewhere yourself. The dark of the breathing screen before you begin now stretches edge to edge on larger screens too.",
    },
  },
  {
    id: "tarot-marked-card",
    date: "2026-06-19",
    tool: "tarot",
    kind: "new",
    title: {
      ko: "타로 테이블 — 점지: 섞는 도중 한 장을 미리 점찍기",
      en: "Tarot Table — mark a card before you draw, mid-shuffle",
    },
    body: {
      ko: "이제 카드를 휘젓는 손길이 한결 느긋해졌어요. 그렇게 천천히 섞다 보면, 아주 가끔 한 장이 옆으로 탁 튕겨 날아갔다가 화면 가장자리에 살며시 돌아와 떠오릅니다. 심상치 않은 그 카드를 직접 누르면, 비로소 \"이 카드를 미리 점지하시겠어요?\" 하고 묻습니다. 수락하면 펼쳐진 스물두 장 가운데 그 카드에 ✦ 표식이 남아, 손이 어디로 향할지 미리 점찍어 둘 수 있어요. 꼭 그 카드를 골라야 하는 건 아닙니다 — 골라도, 지나쳐도 리딩은 평소 그대로 흘러가고, 점지한 카드를 정말 뽑으면 결과에 그 표시가 함께 남아요. 점지는 직감으로 한 장을 미리 점찍어 보는 우연한 재미일 뿐, 카드가 정해지는 방식에는 손대지 않습니다 — 덱은 점지와 상관없이 이미 정해져 있고, 고르기 전에 정해져 있었다는 것도 그대로 확인할 수 있어요. 자주 일어나는 일은 아니니, 찾아오면 반가운 마음으로 맞아 주세요.",
      en: "The shuffle now turns at a calmer, slower pace. As you stir it gently, every so often one card flicks out to the side and then drifts back to settle near the edge. Tap that card yourself, and only then does it ask — \"Mark this card before you draw?\" Accept, and a ✦ stays on that card among the twenty-two laid out, a quiet hunch of where your hand might go. You're never bound to it — choose it or pass it by, and the reading flows on as always; draw the marked card for real and your result carries that mark with it. Marking is simply a playful hunch, a chance to call a card early; it never touches how the cards are settled — the deck is already set regardless, and you can still confirm it was set before you chose. It only visits now and then, so when it does, simply let it in.",
    },
  },
  {
    id: "tarot-share-question-domains",
    date: "2026-06-19",
    tool: "tarot",
    kind: "improved",
    title: {
      ko: "타로 테이블 — 공유 이미지에 내 질문 · 공유 버튼 하나로 · '그 외' 질문",
      en: "Tarot Table — your question in the shared image, one share button, an \"Other\" topic",
    },
    body: {
      ko: "리딩을 이미지로 공유하면 이제 카드 위에 내가 직접 적은 질문이 함께 담깁니다 — 카드와 풀이가 어떤 물음에서 나왔는지 한눈에 남아요. 공유 버튼은 하나로 모았어요. 누르면 휴대폰에서는 공유 창으로, 데스크톱에서는 이미지 복사나 저장으로, 지금 쓰는 화면에 맞춰 알아서 이어집니다. 질문의 자리에는 '그 외'가 새로 생겨, 연애·일·돈·관계·자기 어디에도 딱 맞지 않는 물음도 그대로 놓을 수 있고, 그땐 카드의 모든 의미를 한쪽으로 기울이지 않고 고르게 펼쳐 보여줘요. 질문은 열 자 이상 적어야 다음으로 넘어가도록 글자 수가 가만히 곁에서 알려주고, 시작 전 숨을 고르는 화면의 어둠은 이제 좌우 끝까지 가득 찹니다.",
      en: "Sharing a reading as an image now places the question you wrote above the cards — so the cards and meanings always carry the words they answered. The share controls are now a single button: on a phone it opens the share sheet, on a desktop it copies or saves the image, choosing whatever fits where you are. The topic list gains an \"Other\" choice for a question that doesn't fit love, work, money, relationships, or self, and every meaning of the cards is then laid out evenly, given the same weight, with none favored over another. A question needs at least ten characters before you move on, with a quiet count beside you, and the dark backdrop of the breathing screen now stretches edge to edge.",
    },
  },
  {
    id: "tarot-share-bgm-flip",
    date: "2026-06-12",
    tool: "tarot",
    kind: "improved",
    title: {
      ko: "타로 테이블 — 공유 이미지에 결과 · 리딩 중 음악 · 역방향 세로 플립",
      en: "Tarot Table — results in shared images, music through the reading, reversed cards flip vertically",
    },
    body: {
      ko: "리딩을 이미지로 공유하면 카드와 함께 핵심 키워드·풀이가 담깁니다. 배경 음악은 리딩 화면까지 끊기지 않고 이어지고, 역방향으로 뒤집기를 고르면 카드가 위아래로 넘어가요 — 정방향은 좌우로 넘어가던 그대로입니다.",
      en: "Sharing a reading as an image now includes the key words and meanings alongside the cards. The background music plays on through the reading screen, and choosing a reversed flip turns the cards top-to-bottom — upright still turns side-to-side.",
    },
  },
  {
    id: "tarot-ambient-bgm",
    date: "2026-06-12",
    tool: "tarot",
    kind: "new",
    title: {
      ko: "타로 테이블 — 의식 BGM 추가",
      en: "Tarot Table — ambient music for the ritual",
    },
    body: {
      ko: "리딩을 시작하면 잔잔한 배경 음악이 의식을 감쌉니다. 셔플부터 오픈까지 함께 흐르다가, 리딩 화면에서는 조용해져요 — 답은 침묵 속에서. 화면 위 스피커 아이콘으로 언제든 끄고 켤 수 있고, 선택은 기억됩니다.",
      en: "A calm ambient track now accompanies the ritual. It plays from shuffle to reveal, then falls silent on the reading screen — the answer arrives in silence. Toggle it anytime with the speaker icon; your choice is remembered.",
    },
  },
  {
    id: "tarot-launch",
    date: "2026-06-11",
    tool: "tarot",
    kind: "new",
    title: {
      ko: "새 도구: 타로 테이블",
      en: "New tool: Tarot Table",
    },
    body: {
      ko: "변하지 않는 카드 사전으로 읽는 3장 타로가 열렸어요. 직접 섞고, 자르고, 펼쳐진 22장 중 세 장을 골라 뒤집으세요 — 모든 해석은 공개된 카드 사전에서만 나오고, 카드를 고르기 전에 덱이 고정되어 있었다는 것도 직접 확인할 수 있어요. 질문은 기기 밖으로 나가지 않습니다.",
      en: "A three-card tarot read from an unchanging card dictionary. Shuffle, cut, and pick three of the 22 spread cards yourself — every interpretation comes from the public card dictionary alone, and you can verify the deck was fixed before you chose. Your question never leaves your device.",
    },
  },
  {
    id: "favorites-drag-reorder",
    date: "2026-06-03",
    tool: "site",
    kind: "new",
    title: {
      ko: "즐겨찾기 직접 정렬",
      en: "Reorder favorites yourself",
    },
    body: {
      ko: "즐겨찾기 영역의 카드를 드래그해 원하는 순서로 바꿀 수 있어요. 카드 우상단의 손잡이 아이콘을 잡아 옮기세요.",
      en: "Drag favorites into the order you want. Grab the handle at the top-right of each card.",
    },
  },
  {
    id: "hub-card-uniform-height",
    date: "2026-06-02",
    tool: "site",
    kind: "fixed",
    title: {
      ko: "도구 카드 정렬 통일",
      en: "Tool cards aligned consistently",
    },
    body: {
      ko: "카드 높이를 도구별로 동일하게 맞추고, 방문 수(왼쪽)와 피드백 버튼(오른쪽)을 카드 하단에 고정했어요.",
      en: "Cards now share the same height across tools, and the visit count (left) and feedback button (right) sit pinned to the bottom of each card.",
    },
  },
  {
    id: "header-hub-banner",
    date: "2026-06-02",
    tool: "site",
    kind: "improved",
    title: {
      ko: "어디서나 위쪽 BrennHub을 눌러 홈으로",
      en: "Tap BrennHub at the top to go home",
    },
    body: {
      ko: "각 페이지의 '← BrennHub' 링크를 없애고, 위쪽 BrennHub을 누르면 홈으로 돌아오게 통일했어요.",
      en: "Removed the per-page '← BrennHub' link. The BrennHub at the top now takes you home from anywhere.",
    },
  },
  {
    id: "hub-card-admin",
    date: "2026-06-02",
    tool: "site",
    kind: "improved",
    title: {
      ko: "카드 텍스트 다듬기 + 자연스러운 여백",
      en: "Card text tuning + tidier spacing",
    },
    body: {
      ko: "도구 카드의 이름·설명을 운영자가 미리보기 카드 안에서 직접 다듬을 수 있어요. 카드 하단도 더 깔끔해졌습니다.",
      en: "Tool names and descriptions can be tuned right inside a preview card. Card footers look tidier too.",
    },
  },
  {
    id: "favorites-login-required",
    date: "2026-06-02",
    tool: "site",
    kind: "improved",
    title: {
      ko: "로그인 안내 + 우하단 UI 정리",
      en: "Sign-in cues + cleaner bottom-right UI",
    },
    body: {
      ko: "즐겨찾기·좋아요는 로그인 후 사용 가능하다는 안내가 더 명확해졌고, 우하단 버튼이 한결 깔끔해졌어요.",
      en: "Clearer cues that favorites and likes need a sign-in, plus a tidier set of bottom-right buttons.",
    },
  },
  {
    id: "tool-page-likes",
    date: "2026-06-02",
    tool: "site",
    kind: "improved",
    title: {
      ko: "도구 화면에서도 좋아요",
      en: "Like from inside a tool",
    },
    body: {
      ko: "도구를 쓰는 도중에도 우하단 따봉으로 좋아요를 누를 수 있습니다.",
      en: "Press the thumbs-up at the bottom-right while using a tool.",
    },
  },
  {
    id: "tool-visits-count",
    date: "2026-06-02",
    tool: "site",
    kind: "new",
    title: {
      ko: "도구 방문 수 표시",
      en: "Tool visit counts",
    },
    body: {
      ko: "최근 30일 동안 도구를 본 횟수가 카드에 표시됩니다. 자주 찾는 도구를 한눈에 알아볼 수 있어요.",
      en: "Cards show how many times a tool was viewed in the last 30 days. Easier to spot what people use most.",
    },
  },
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
