# 픽셀 미로 만들기 Changelog

주요 결정 / 이정표.

## [0.1.0] — 2026-05-22

### Added (P1 — 스캐폴딩: 인프라/골격 등록)

- **tools-registry 등록** — `lib/tools-registry.ts`에 `maze` entry (status `"coming-soon"`). 페이지 미생성 — `[slug]` fallback이 자동 처리.
- **i18n** — `lib/i18n/messages.ts`: `maze` namespace 골격(`title`/`description`, ko/en) + `feedback.toolMaze` + `tools` 객체 `maze.{name,description}`.
- **도구 폴더 문서 3종** — `README.md`(목적 + 기술 스택 + canonical 데이터 구조) + `BACKLOG.md`(P2 MVP 계획 + V2 후보) + `CHANGELOG.md`(본 파일).
- **루트 `TOOLS.md`** — 도구 인덱스에 maze 등재 (준비 중 표기).
- **D1 마이그레이션 SQL** — `migrations/001_maze.sql`: `maze` 테이블(`short_id` PK 6자 / `payload` JSON / `created_at`) + `created_at` 인덱스.
- **feedback 사전 통합** — `FeedbackTool` 타입에 `"maze"` / `feedback-button` pathname 매핑 / `feedback-dialog` toolOptions / `api/feedback` TOOLS enum / admin `TOOL_LABEL` (BRENNHUB.md §6 통합 체크리스트).

### Decided

- **타일 = 정수 저장** — `TileType = 0 | 1 | 2 | 3` (0:길 / 1:벽 / 2:시작점 / 3:도착점). 64×64 격자를 문자열 유니온으로 직렬화하면 payload ~4배 → 숏링크 경량화 목표와 충돌. 저장 포맷 정수 고정, 매핑 레이어 없음, 가독성은 `TILE` 명명 상수로만. V2 타일(4 Trap / 5 Key / 6 Door)은 주석 예약.
- **격자 = 정사각 3종 고정** — `MazeSize = 16 | 32 | 64`. `width`/`height` 분리 없음 (기획서 사양).
- **Fog of War = MVP 기능** — `fogOfWar`/`fogRadius`를 처음부터 canonical `MazeProject`에 포함. P2에서 필드 추가로 인한 schema 마이그레이션 회피.
- **공유 저장 = D1** — `maze` 테이블 + `short_id`(6자) 숏링크. binding `MAZE_DB`. 별도 인프라 없이 Workers + D1만.
- **D1 binding·DB 생성은 P2로 이연** — P1은 마이그레이션 SQL 파일만 생성. 실제 D1 데이터베이스 생성 + `wrangler.jsonc` binding 배선 + 마이그레이션 적용은 공유 API route를 붙이는 P2 task에서. `wrangler.jsonc`의 `d1_databases` 블록은 top-level + `env.preview` 양쪽에 존재함을 확인 (신규 binding 추가 시 양쪽 명시 필요).

### Notes

- 페이지 파일(`page.tsx`) 미생성 — `[slug]` fallback이 자동 처리. P2 MVP task에서 page.tsx 생성과 동시에 status `"live"` 전환 (route collision 방지).
- API route(`app/api/maze/route.ts`) P1 미생성 — `runtime = "edge"` 이슈는 P2에서 적용. OpenNext 미지원이므로 명시 금지 (BRENNHUB.md §7).
- 외부 기획서 필터 7개 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당.

### Next

- P2 MVP 빌드는 별도 task. `BACKLOG.md` P2 섹션이 단일 출처.
