# 픽셀 미로 만들기 Changelog

주요 결정 / 이정표.

## [0.2.0] — 2026-05-22

### Added (P2 — 2-step 그리드 에디터)

- **코어 로직** — `lib/maze/`: `types.ts`(`TileType` 정수 유니온 · `TILE` 명명 상수 · `MazeProject` · `SIZES` · `FOG_RADIUS`) + `grid.ts`(`emptyGrid`/`cloneGrid`/`isValidGrid`/`findStart`/`newMazeId`/`newProject`) + `storage.ts`(localStorage hydrate/persist/schemaVersion 마이그레이션).
- **페이지** — `app/tools/maze/{page,client-shell}.tsx` — Server shell + client 오케스트레이션. 단일 `MazeProject` state + 스텝/도구/다이얼로그 UI state.
- **UI 컴포넌트** — `components/maze/`: `step-nav`(2스텝 네비) · `settings-panel`(Step1 크기·fog) · `tool-palette`(Step2 도구 4종) · `maze-grid`(canvas 격자 에디터) · `reset-confirm-dialog`(맵 초기화 확인 모달).
- **Step1 설정** — 맵 크기 16/32/64 정사각 선택 + Fog of War 토글(공유 `Switch`) + 시야 반경 1~6 입력(공유 `NumberStepper`, `showBigStep={false}`).
- **Step2 그리기** — 벽 / 지우개 / 시작점 / 도착점 도구로 격자를 클릭·드래그 페인트. 시작점 1개(이동), 도착점 멀티 배치.
- **i18n** — `maze` namespace를 에디터 문자열 전체로 확장 (ko/en).

### Changed

- **데이터 구조 확정** — `MazeProject`에 `id`(P4 숏링크용) 추가, 격자 필드명 `tiles` → `grid`, 크기 필드 `width`/`height` → 단일 `size: 16|32|64`. README canonical 갱신.
- **BACKLOG 단계 재분할** — 기존 "P2 V1 MVP" 단일 묶음을 P2(에디터) / P3(검증·플레이·fog) / P4(공유)로 분리.

### Decided

- **step-by-step UX = 언어 창조기 패턴 재사용** — `page` → `client-shell`(오케스트레이션) → `StepNav` 구조와 pixel-editor 포인터 드로잉(`drawingRef`/`cellFromEvent`/`setPointerCapture`/`touchAction:"none"`)을 코드에서 확인 후 1:1 미러링. 추측 패턴 없음.
- **사이즈 잠금** — Step1에서 사이즈 확정. Step2→Step1 복귀 시 확인 다이얼로그 → 맵 전면 리셋. Padding/Crop 로직 없음 (V1 복잡도 차단).
- **route collision 회피** — 전용 `page.tsx`가 있어도 status `"coming-soon"`을 유지하기 위해 registry `Tool`에 `hasPage` 플래그 추가 + `[slug]` `generateStaticParams`가 `hasPage` 슬러그를 제외. live 전환은 P4.
- **localStorage 영속 포함** — 에디터 작업본을 새로고침에도 유지 (language-maker hydrate/persist 패턴). `MazeProject.schemaVersion` 활용.

### Notes

- 빌드: `/tools/maze`가 전용 정적 route로 prerender — `[slug]` fallback에서 제외되어 route collision 없음.
- 검증(외곽 폐쇄·BFS) · 플레이 모드 · Fog 렌더는 P3, 숏링크 공유(D1·API)는 P4. 본 단계 미포함.
- API route 미생성 — `runtime = "edge"` 이슈 무관.

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
