# 픽셀 미로 만들기 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

단계: **P1** 스캐폴딩 · **P2** 그리드 에디터 · **P3a** 완결성 검증 · **P3b** 플레이·Fog 렌더 · **P4** 숏링크 공유.

## P1 — 스캐폴딩 (인프라/골격) — 완료 (CHANGELOG `[0.1.0]`)

- [x] `tools-registry.ts`에 `maze` entry (status `"coming-soon"`)
- [x] i18n — `maze` namespace 골격 + `feedback.toolMaze` + `tools` 객체
- [x] 도구 폴더 문서 3종 (`README`/`BACKLOG`/`CHANGELOG`)
- [x] 루트 `TOOLS.md` 인덱스에 maze 등재
- [x] D1 마이그레이션 SQL — `migrations/001_maze.sql`
- [x] feedback 사전 통합 (button/dialog/api/admin)

## P2 — 그리드 에디터 — 완료 (CHANGELOG `[0.2.0]`)

### 타입 / 코어

- [x] `lib/maze/types.ts` — `TileType`(정수 유니온) / `TILE` 명명 상수 / `MazeSize` / `MazeTheme` / `MazeProject` / `SIZES` / `FOG_RADIUS` (README canonical 상속)
- [x] `lib/maze/grid.ts` — 격자 헬퍼 `emptyGrid` / `cloneGrid` / `isValidGrid` / `findStart` / `newMazeId` / `newProject`
- [x] `lib/maze/storage.ts` — localStorage hydrate + persist + schemaVersion 마이그레이션 (language-maker `migrate()` 패턴)

### 페이지 / UI

- [x] `app/tools/maze/page.tsx` (Server shell) + `client-shell.tsx` (`"use client"`)
- [x] `components/maze/step-nav.tsx` — 2스텝(설정 → 그리기), 언어 창조기 StepNav 구조 재사용
- [x] `components/maze/settings-panel.tsx` — Step1: 사이즈 16/32/64 + Fog 토글(`Switch`) + 시야 반경(`NumberStepper`)
- [x] `components/maze/tool-palette.tsx` — Step2: 벽 / 지우개 / 시작점 / 도착점 (Lucide `Square`/`Eraser`/`Smile`/`Flag`)
- [x] `components/maze/maze-grid.tsx` — Step2: `<canvas>` 격자 에디터, pixel-editor 포인터 드로잉 패턴 재사용
- [x] `components/maze/reset-confirm-dialog.tsx` — Step2→Step1 "맵 초기화" 확인 모달
- [x] 시작점 1개(이동) / 도착점 멀티 배치 규칙
- [x] 사이즈 잠금 — Step2에서 변경 불가, Step1 복귀 시 확인 후 전면 리셋 (Padding/Crop 없음)
- [x] 다크/라이트 대응 — `useTheme()` 구독 (canvas 색)

### 통합

- [x] i18n — `maze` namespace를 에디터 문자열로 확장 (ko/en)
- [x] route collision 회피 — registry `Tool.hasPage` 플래그 + `[slug]` `generateStaticParams` 필터 (status는 `coming-soon` 유지)

### 검증

- [x] `npm run build` 통과 — `/tools/maze`가 전용 정적 route로 emit, `[slug]`와 collision 없음
- [ ] dev 검증 — 2-step 흐름 / 사이즈별(16·32·64) 드로잉 / 다크·라이트 / 모바일 터치 (dev 배포 후 사용자 시각 검증)

## P2.1 — 회귀 수정 (start/goal 아이콘) — 완료 (CHANGELOG `[0.2.1]`)

dev 시각 검증에서 발견. 기획서 V1 매핑(시작점 = `User` 아이콘, 도착점 = `Flag` 아이콘)이 단색 fill로 잘못 렌더되던 문제 수정 + 렌더러 추상화 도입(V2 sprite-dungeon 위한 전제 구조).

- [x] `lib/maze/render/{types,icons,default,index}.ts` 신규 — `RenderEngine` 인터페이스 + `selectEngine` 진입점 + lucide-react v1.14.0 iconNode 직접 임베드(User/Flag, ISC)
- [x] `default.ts` `strokeIcon` Path2D 헬퍼 — lineWidth 적응 공식 `Math.max(2, 1.25/drawScale)` 인라인 도출
- [x] `maze-grid.tsx` 재배선 — 인라인 `fillRect`/`stroke` 제거, engine 3-단계 오케스트레이션, `MazeTheme` prop + `await engine.ready?.()` + cancel 가드
- [x] `client-shell.tsx` — `<MazeGrid theme={project.theme}>` prop
- [x] DPR 보존 규약 — 엔진 `ctx.setTransform` 금지, 외부 1회 설정 (RenderEngine 주석 명시)
- [x] `npm run build` 통과 (TS·SSR)
- [ ] dev 재배포 후 사용자 시각 점검 — start/goal 아이콘 + 틴트 / 사이즈별 / 다크·라이트 / 모바일

### V2 caveat (BACKLOG에 명시)

- V2 `sprite-dungeon` 엔진은 스프라이트 시트 비동기 로드가 필요할 가능성 — `RenderEngine.ready?: () => Promise<void>` 훅으로 처리. maze-grid는 이미 `await engine.ready?.()` + cancel 가드를 두므로 V2 추가 시 maze-grid 변경 0. **단** 새 엔진이 ready 훅을 노출하는 것이 전제 — "변경 0" 주장은 이 전제 위에서만 성립 (silent oversell 금지).

## P3a — 완결성 검증 — 완료 (CHANGELOG `[0.3.0]`)

- [x] `lib/maze/validate.ts` — `validateMaze(grid)` + `ValidationResult` 타입 + 4방향 BFS
- [x] 규칙1(엔드포인트) — 시작 정확히 1개 + 도착 1개 이상
- [x] 규칙2(외곽 폐쇄) — boundary clamp 자동 충족, 명시 체크 없음(헤더 명문화)
- [x] 규칙3(도달성) — 시작→도착 BFS. endpoints 미통과 시 `skipped` 보류
- [x] `components/maze/validation-panel.tsx` — Step2 배지 + 펼침 상세
- [x] `client-shell.tsx` — `useMemo` 라이브 재계산
- [x] i18n `maze.validation*` 키 12개 (ko/en)
- [x] 빈 grid 안전 가드 — Step2 진입 직후 크래시 없음
- [ ] dev 시각 점검 — 빈/미완성/완성/도달 불가 미로에서 패널 반응 + 펼침 + 다크·라이트

## P3b — 플레이 · Fog 렌더

- [ ] 플레이 모드 — 시작점에서 이동(키보드·터치), 도착점 도달 판정
- [ ] **플레이어 이동 규약(P3a에서 확정)** — `r,c`를 `[0, size-1]` clamp + WALL 진입 차단. 외곽 EMPTY 통과 가능. BFS 통과성과 일치
- [ ] Fog of War 렌더 — `fogOfWar`/`fogRadius` 기반 시야 제한 표시
- [ ] 검증 실패 미로는 플레이 진입 차단 (validation-panel이 이미 사유 표시)

## P4 — 숏링크 공유 (D1 · API) + live 전환

- [ ] D1 데이터베이스 생성 (`brennhub-maze` / `brennhub-maze-dev`) + `wrangler.jsonc` top-level·`env.preview` 양쪽 `MAZE_DB` binding 배선 + `001_maze.sql` 적용
- [ ] `lib/maze/share.ts` — `short_id`(6자) 생성 · `MazeProject` payload 직렬화/역직렬화
- [ ] 공유 API `app/api/maze/route.ts` — 저장(POST)/조회(GET). **`export const runtime = "edge"` 금지** (BRENNHUB.md §7)
- [ ] `page.tsx` — `?m=<short_id>` searchParams 서버 fetch → 공유된 미로 로드
- [ ] 숏링크 발급/복사 UI
- [ ] `tools-registry.ts` status `"coming-soon"` → `"live"` 전환 + `hasPage` 정리

## V2 후보 (효능감 검증 후 별도 task)

- [ ] **Trap / Key / Door 타일** — `TileType`에 정수 `4`(Trap) / `5`(Key) / `6`(Door) 확장. 잠금-열쇠 퍼즐 메커닉.
- [ ] **테마 시스템** — `MazeTheme`의 `"sprite-dungeon"` 활성화. 타일 스프라이트 세트 교체.
- [ ] **공유 API rate limit** — `maze` 저장 POST에 IP 해시 기반 rate limit (feedback `RATE_LIMIT_WINDOW_MS` 패턴 재사용).
- [ ] **인기 미로 랭킹** — `created_at` 인덱스 + 조회수/플레이수 컬럼 기반 랭킹 보드.
- [ ] **외곽 EMPTY = 둘레 고속도로 — soft 디자인 hint 후보** — 규칙2는 clamp으로 자동 충족이라 강제 안 함. 단 외곽 한 줄이 모두 EMPTY면 BFS상 둘레가 사실상 고속도로처럼 작동해 의도치 않은 트리비얼 풀이가 생기기 쉬움. 강제 검증으로 올리지 말고, "외곽이 비어 있어요 — 의도한 디자인인가요?" 톤의 soft hint 배지를 효능감 검증 후 별도 task로 검토.

## 도메인 결정 (확정)

- 타일 저장 = **정수** (`0~3`, V2 `4~6`). 문자열 유니온은 64×64 payload ~4배 → 숏링크 경량화와 충돌. 매핑 레이어 없이 저장값이 곧 정수, 가독성은 `TILE` 명명 상수.
- 격자 크기 = **16 / 32 / 64 정사각 3종 고정** (`width`/`height` 분리 없음). 기본값 32.
- **사이즈 잠금** — Step1에서 사이즈 확정, Step2 그리기 중 변경 불가. Step1 복귀 시 "맵 초기화" 확인 → 전면 리셋. Padding/Crop 로직 없음 (V1 복잡도 차단).
- **Fog of War는 MVP 기능** — `fogOfWar`/`fogRadius`를 P1 canonical `MazeProject`에 포함. `fogRadius` = Min 1 / Max 6 / default 3 (정수·칸, 세 사이즈 공통).
- `theme` = `"default"` | `"sprite-dungeon"`. V1은 `"default"`만 사용.
- 도구 = 벽 / 지우개 / 시작점 / 도착점. 시작점 1개(이동), 도착점 멀티.
- UX = 2-step (설정 → 그리기). 언어 창조기 step-by-step 패턴 재사용.
- route collision — 전용 `page.tsx`가 있어도 `coming-soon` 유지하려면 registry `hasPage` 플래그로 `[slug]` emit에서 제외. live 전환은 P4.
- 공유 = D1 `maze` 테이블, `short_id` 6자. binding `MAZE_DB` (P4에서 배선).

## 출처

- 외부 기획서 (Brenn 수령, 2026-05-22) + brennhub 외부 기획서 필터 7개 적용 결과.
- 필터 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당 (Workers + D1 완결).
- 단계 분할 — P2 에디터 / P3 검증·플레이·fog / P4 공유. 의도적 점진 출시.
