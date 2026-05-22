# 픽셀 미로 만들기 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

## P1 — 스캐폴딩 (인프라/골격) — 완료 (CHANGELOG `[0.1.0]`)

- [x] `tools-registry.ts`에 `maze` entry (status `"coming-soon"`) — 페이지 미생성, `[slug]` fallback 자동 처리
- [x] i18n — `maze` namespace 골격(ko/en `title`/`description`) + `feedback.toolMaze` + `tools` 객체 `maze.{name,description}`
- [x] 도구 폴더 문서 3종 (`README`/`BACKLOG`/`CHANGELOG`)
- [x] 루트 `TOOLS.md` 인덱스에 maze 등재 (준비 중 표기)
- [x] D1 마이그레이션 SQL — `migrations/001_maze.sql` (`maze` 테이블: `short_id`/`payload`/`created_at`)
- [x] feedback 사전 통합 — `feedback-button.tsx` pathname 매핑 / `feedback-dialog.tsx` `FeedbackTool` + toolOptions / `api/feedback/route.ts` TOOLS enum / admin `TOOL_LABEL`
- [x] `npm run build` 통과 + `/tools/maze`가 `[slug]` fallback으로 처리됨 확인

## P2 — V1 MVP (status "coming-soon" → "live")

### 인프라

- [ ] D1 데이터베이스 생성 (`brennhub-maze` / `brennhub-maze-dev`) + `wrangler.jsonc` top-level·`env.preview` 양쪽에 `MAZE_DB` binding 배선 + `001_maze.sql` 적용
- [ ] `app/tools/maze/page.tsx` (Server Component) + `client-shell.tsx` (`"use client"`)
- [ ] `tools-registry.ts` status `"coming-soon"` → `"live"` 전환 (page.tsx 생성과 같은 commit — route collision 방지)
- [ ] 공유 API `app/api/maze/route.ts` — 저장(POST)/조회(GET). **`export const runtime = "edge"` 금지** (BRENNHUB.md §7)

### 데이터 / 상태

- [ ] `lib/maze/types.ts` — `TileType`(정수 유니온) / `MazeProject` / `TILE` 상수 (README canonical 정의 상속)
- [ ] `lib/maze/storage.ts` — localStorage hydrate + persist + schemaVersion 마이그레이션 (supp-plan `migrate()` 패턴)
- [ ] `lib/maze/share.ts` — `short_id`(6자) 생성 · `MazeProject` payload 직렬화/역직렬화

### UI 컴포넌트

- [ ] `components/maze/maze-grid.tsx` — `<canvas>` 픽셀 격자 에디터 (클릭/드래그로 타일 찍기)
- [ ] `components/maze/tile-palette.tsx` — 타일 선택 팔레트 (길/벽/시작점/도착점)
- [ ] `components/maze/size-selector.tsx` — 16/32/64 정사각 선택
- [ ] Fog of War 플레이 모드 — `fogOfWar`/`fogRadius` 기반 시야 제한 렌더
- [ ] 숏링크 공유 UI — 저장 → `/tools/maze?m=<short_id>` 발급/복사
- [ ] 다크/라이트 모드 대응

### 검증

- [ ] `npm run build` — `/tools/maze`가 별도 정적 row로 emit (route collision 없음)
- [ ] feat→dev→main 머지·push 후 다크/라이트·모바일 시각 검증

## V2 후보 (효능감 검증 후 별도 task)

- [ ] **Trap / Key / Door 타일** — `TileType`에 정수 `4`(Trap) / `5`(Key) / `6`(Door) 확장. 잠금-열쇠 퍼즐 메커닉.
- [ ] **테마 시스템** — `MazeTheme`의 `"sprite-dungeon"` 활성화. 타일 스프라이트 세트 교체.
- [ ] **공유 API rate limit** — `maze` 저장 POST에 IP 해시 기반 rate limit (feedback `RATE_LIMIT_WINDOW_MS` 패턴 재사용).
- [ ] **인기 미로 랭킹** — `created_at` 인덱스 + 조회수/플레이수 컬럼 기반 랭킹 보드.

## 도메인 결정 (확정)

- 타일 저장 = **정수** (`0~3`, V2 `4~6`). 문자열 유니온은 64×64 payload ~4배 → 숏링크 경량화와 충돌. 매핑 레이어 없이 저장값이 곧 정수, 가독성은 `TILE` 명명 상수.
- 격자 크기 = **16 / 32 / 64 정사각 3종 고정** (기획서 사양, `width`/`height` 분리 없음).
- **Fog of War는 MVP 기능** — `fogOfWar`/`fogRadius`를 P1 canonical `MazeProject`에 포함 (P2 schema 마이그레이션 회피).
- `theme` = `"default"` | `"sprite-dungeon"`. V1은 `"default"`만 사용.
- 공유 = D1 `maze` 테이블, `short_id` 6자. binding `MAZE_DB` (P2에서 배선).

## 출처

- 외부 기획서 (Brenn 수령, 2026-05-22) + brennhub 외부 기획서 필터 7개 적용 결과.
- 필터 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당 (Workers + D1 완결).
- P1 스코프는 의도적 축소 — 실제 에디터 로직은 P2.
