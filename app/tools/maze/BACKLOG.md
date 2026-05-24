# 픽셀 미로 만들기 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

단계: **P1** 스캐폴딩 · **P2** 그리드 에디터 · **P3a** 완결성 검증 · **P3a-2** 미로 점수 · **P3b** 플레이·Fog 렌더 · **P3c-1** 에디터 UX · **P3c-2** 길 그리기 + 벽 생성 · **P3d** 만들기 단계 통합 · **P3e-1** 편집 줌/팬 + 변환 인프라 · **P3f-A** 직사각 내부 일반화 · **P3f-B** 비정사각 UI · **P3e-2** 플레이 카메라 · **사운드** · **P4a** 숏링크 공유 · **P4b** 보정 + 라이브 · **P5a** 제한 시간 데이터 모델·UI · **P5b** 플레이 카운트다운·게임오버.

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

## P3a-2 — 미로 품질 점수 — 완료 (CHANGELOG `[0.5.0]`)

- [x] `lib/maze/validate.ts` `scoreMaze(grid)` — 순수 결정론 점수 산출
- [x] A(detour) = BFS 최단 / 맨해튼, saturation=4
- [x] B(corridor × texture) — 복도성 base + 텍스처 보너스. 빈 들판이 corridor=0이라 B=0 자동 보장
- [x] "진짜" 막다른 길 = degree==1 AND tile ∉ {START, GOAL} — 외길 텍스처=0 분리
- [x] 합성 = sqrt(A × B) — 가산식 외길>미로 역전 차단
- [x] 트리비얼 가드 — manhattan ≤ 1 강제 ★1
- [x] 약점 단일 표시 (low-detour / no-corridors / no-texture)
- [x] `SCORE_TUNING` 한 블록 — 재튜닝 핸들 단일 출처
- [x] `validation-panel.tsx` — 별점 + 차원 바 3개 + weakness 안내
- [x] `client-shell.tsx` — useMemo(scoreMaze) 라이브 재계산
- [x] i18n score* / weak* 8키 (ko/en)
- [x] **dev archetype 실측 임계값 보정 (필수)** — 1.0.0에서 6종 archetype(빈 들판/살짝 굽은 길/적당한 미로/구불구불 외길/정통 분기 미로/크고 복잡한 미로) 실측 → `STAR_THRESHOLDS = [0.2, 0.49, 0.71, 0.88]` 확정.
- [x] **archetype 보정용 콘솔 신호 제거** — 1.0.0에서 `client-shell.tsx` `useEffect([score]) console.log("[maze score]", ...)` 통째 제거.

## P3b — 플레이 · Fog 렌더 — 완료 (CHANGELOG `[0.4.0]`)

- [x] `lib/maze/play.ts` — `PlayState`/`Dir` + `initialPlayState`/`applyMove`/`isWin`
- [x] `lib/maze/grid.ts` `isPassable` 단일 헬퍼 — BFS·이동 정의 공유. validate.ts 인라인 제거
- [x] RenderEngine 확장 — `playerTint`/`playerIcon` + `renderPlayer` (필수 메서드)
- [x] StepNav 3-step + `disabledSteps` — `validation.ok=false` 시 Step3 disabled
- [x] `components/maze/play-canvas.tsx` — fog ON 시 검정 배경 + 시야 안 셀만 + **격자선도 시야 안만**
- [x] `components/maze/play-controls.tsx` — D-pad + 키보드(방향키/WASD), 방향키 `preventDefault`
- [x] `components/maze/win-dialog.tsx` — 승리 모달 (다시 플레이/편집 복귀)
- [x] `components/maze/play-mode.tsx` — Step3 컨테이너 + P4 재사용 인터페이스
- [x] `client-shell.tsx` — Step3 라우팅, 1↔2↔3 전이
- [x] i18n `maze.step3` + `maze.play*`/`maze.win*` 키 11개 (ko/en)
- [ ] dev 시각 점검 — Step3 활성/비활성 / 이동(키보드·D-pad) / 벽 충돌·경계 / 승리 모달 / fog(반경 1·3·6) / 다크·라이트 / 32×32·64×64

## P3d — 만들기 단계 통합 — 완료 (CHANGELOG `[0.8.0]`)

- [x] StepNav 2노드 (만들기·플레이), Step = 1|2 축소
- [x] 통합 화면 레이아웃 — 위 고정 / 아래 가변
- [x] 사이즈 변경 시 확인 다이얼로그 (비어있으면 즉시) — ResetConfirmDialog 재사용
- [x] SettingsPanel 단순화 (onStart·settingsIntro 제거)
- [x] hydrate 시 빈 grid 자동 채움
- [x] 키보드 step 의존 갱신 (만들기 한정)
- [x] step 리터럴 전수 재번호 (disabledSteps·키보드·플레이 뷰·WinDialog 복귀·주석)
- [x] i18n cleanup (step3·startButton·settingsIntro·drawIntro 제거 + sizeChange* 3키 추가)
- [ ] dev 시각 점검 — 통합 화면 / 모바일 그리드 가시성 / 사이즈 변경 다이얼로그 / 빈 grid 즉시 변경 / 키보드 만들기만 / 0.7.1 회귀(Footprints·commit 박스)

## P3e-1 — 편집 줌/팬 + 변환 인프라 — 완료 (CHANGELOG `[0.9.0]`)

- [x] `lib/maze/viewport.ts` 순수 산술 모듈 — ViewState · fitView · clampPan · zoomAtCursor · cellFromCanvasPx · cameraFollow · zoomLimits
- [x] `RenderEngine.drawGridLines` 시그니처 확장 (panX, panY, cellPx, size). default 엔진 갱신
- [x] `components/maze/zoom-controls.tsx` — 캔버스 우상단 오버레이 (손도구·+/−·맞춤)
- [x] maze-grid view props + 셀 좌표 변환 + 멀티터치 (1포인터 그리기/팬, 2포인터 핀치+팬) + 휠(addEventListener passive:false) + 스페이스 일시 손도구
- [x] 1→2 포인터 전환 시 stroke finalize (drawingRef/lastCellRef 리셋, client-shell ref들은 다음 isInitial이 덮어씀)
- [x] client-shell view/handMode state + applySizeChange/hydrate에 view fit 리셋 + handleViewChange 방어적 재clamp
- [x] play-canvas drawGridLines 새 시그니처 호환 (panX=0, panY=0)
- [x] i18n 4키 — viewZoomIn / viewZoomOut / viewFit / viewHand (ko/en)
- [ ] dev 시각 점검 — 16맵 컨트롤 비활성·32/64맵 줌인 한계(16맵 셀 크기)·줌아웃 한계(fit)·휠 커서 중심·모바일 핀치/팬·스페이스 일시 손도구·손도구 토글·우상단 오버레이가 셀 그리기 가리는지

## P3f-A — 직사각 그리드 내부 일반화 — 완료 (CHANGELOG `[0.10.0]`)

- [x] schemaVersion 1 → 2 + storage migrate (v1 size → v2 width/height, stale size 명시 destructure 제거)
- [x] types.ts — width/height + DIM_MIN/MAX, MazeSize/SIZES/DEFAULT_SIZE 폐기, SIZE_PRESETS 호환
- [x] grid.ts — emptyGrid(width, height) + isValidGrid(value, width, height)
- [x] validate.ts — BFS/scoreMaze 차원 분리 (`r < height && c < width`)
- [x] play.ts — applyMove 경계 분리
- [x] viewport.ts — width/height 양 인자 (zoomLimits·fitView·clampPan·zoomAtCursor·cellFromCanvasPx·cameraFollow)
- [x] render/types.ts·default.ts — drawGridLines(panX, panY, cellPx, width, height)
- [x] maze-grid·play-canvas·play-mode·client-shell·settings-panel 모두 props/state width/height
- [x] settings-panel UI 무변경 — 정사각 프리셋 (s, s) 호출
- [ ] dev 검증 — 16/32/64 정사각 회귀 0 / v1 localStorage 자동 migrate (DevTools 확인)

## P3f-B — 비정사각 UI + 캔버스 처리 + 가시 셀 컬링 — 완료 (CHANGELOG `[0.11.0]`)

- [x] settings-panel — W·H NumberStepper (DIM_MIN..DIM_MAX) + 정사각 프리셋 quick-pick
- [x] 스테퍼 ↔ 다이얼로그 충돌 해소 — local pending state + 명시 [적용] 버튼이 1회 onSizeChange 호출
- [x] 외부 변경(프리셋·undo) 시 useEffect로 local 동기화
- [x] 비정사각 캔버스 처리 — viewport.ts (Phase A에서 일반화됨) 활용. 시각 검증 dev에서.
- [x] 가시 셀 컬링 — maze-grid에 [rMin,rMax)×[cMin,cMax) 범위 산출, renderTile/renderPathMark 둘 다 컬링
- [x] client-shell handleSizeChange → handleDimsChange 이름 변경
- [x] i18n 7키 (ko/en) — widthLabel/heightLabel/applySize/presetsLabel/dimMaxReached/dimMinReached
- [ ] dev 검증 — W·H 경계 3·128 / 50×150·128×4·3×128 비정사각 / 128×128 컬링 매끄러움 / 16/32/64 회귀 0
- [ ] 비정사각 점수 archetype 검증 — 32×64 정통 미로로 console.log raw total 측정 가이드 (별도 task)
- [ ] play-canvas 가시 셀 컬링 — 플레이 카메라(P3e-2)와 함께 적용

## P3e-2 — 플레이 카메라 + 제작자 설정 시야 거리 — 완료 (CHANGELOG `[0.12.0]`)

원 plan "16칸 고정"을 사용자 요구대로 가변 `playViewSpan` 필드로 개정.

- [x] `MazeProject.playViewSpan: number` + `schemaVersion 2 → 3` migrate (v2→v3 기본 16)
- [x] storage clamp `[16, max(W,H)]` 손상값·stale 방어
- [x] settings-panel 시야 거리 NumberStepper row — `max(W,H) > 16`일 때만 렌더
- [x] play-canvas cameraFollow 적용 — viewport.ts 무변경, 호출자만 신규
- [x] play-canvas 가시 셀 컬링 (Phase B 미뤘던 것)
- [x] fog clip center 카메라 변환 보정
- [x] 플레이어 셀 마커 skip (0.10.1) 유지
- [x] applySizeChange에 playViewSpan clamp 추가 — stale 저장값 정렬 (사용자 정정)
- [x] handlePlayViewSpanChange 즉시 적용 (grid 영향 0)
- [x] i18n 3키 (ko/en)
- [ ] dev 시각 점검 — v2→v3 migrate / 16×16 row 미렌더 / 32 N=16↔32 / 64 N=16/32/64 / 비정사각 / fog+카메라 / "다시 플레이" / 64×64 N=16 컬링 성능

## 사운드 — 완료 (CHANGELOG `[0.13.0]`)

- [x] `lib/maze/sound.ts` singleton — Web Audio 합성, AudioContext lazy + idempotent resume
- [x] move(40ms sine) / blocked(100ms triangle) / win(C major 3음 분산) — 짧고 무난
- [x] move 50ms 스로틀 + blocked 같은 방향 1회 억제 (오토리핏 드론 차단)
- [x] 음소거 토글 + localStorage 영속 (전역, MazeProject 무관)
- [x] PlayMode mount init (autoplay 우회) + 매 호출 idempotent resume (iOS Safari 폴백)
- [x] play.ts 무변경 — 사운드는 play-mode 컴포넌트가 applyMove 결과 비교로 트리거
- [x] i18n 2키 (ko/en) — soundMute / soundUnmute
- [ ] dev 점검 — autoplay 정책 / 모바일 (iOS Safari) / blocked 억제 (방향키 오토리핏) / 음소거 영속 / 플레이 카메라·fog 회귀 0

## 배경음 — 보류 (BACKLOG)

- [ ] 사용자 dev 점검 후 결정. 합성 제너러티브 앰비언트 vs 음원 파일(외부 인프라). "어설픈 배경음보다 없는 게 나음" 원칙.

## Px — 등급 flavored 네이밍 (점수 튜닝 안정화 후)

- [ ] 별점에 등급 라벨 부여 — 예: ★1 = "들판", ★2 = "산책로", ★3 = "미로", ★4 = "던전", ★5 = "고문실" (가칭, 톤은 별도 결정). UI 헤드라인에 별점 옆 표시. **선행 조건**: 위 "dev archetype 실측 임계값 보정" 완료 — 임계값이 흔들리는 상태에선 라벨이 잘못 붙음.

## P3c-1 — 에디터 UX (undo/redo · 벽 재클릭 토글 · 초기화) — 완료 (CHANGELOG `[0.6.0]`)

- [x] `GridHistory = { past, future }` state + stroke 단위 push (`HISTORY_DEPTH=100`)
- [x] `EditorControls` 컴포넌트 — undo·redo·초기화 row (좌·우 분리, flex-wrap)
- [x] 키보드 `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` (Cmd 동일), Step2 한정 mount/unmount
- [x] 벽 재클릭 토글 — pointerdown 시작 셀 기반 stroke 일관성(`strokeFillRef`)
- [x] 그리드 초기화 — `ResetConfirmDialog` props 일반화 + 신규 모달 인스턴스, undo 가능
- [x] No-op 가드 — 실제 grid 변경 없을 때 history·setProject 모두 skip
- [x] 불변 갱신 명문화 — `cloneGrid` 후 mutate, 원본 grid 보존 (history 스냅샷 오염 차단)
- [x] handleStart / handleConfirmReset 시 `setHistory(EMPTY_HISTORY)`
- [x] i18n 6키 (ko/en) — editorUndo·editorRedo·editorResetGrid·resetGrid{Title,Message,Confirm}
- [ ] dev 시각 점검 — undo/redo 스트로크 단위 / 키보드+모바일 버튼 / 벽 재클릭+드래그 일관성 / 초기화+undo / Step3 키보드 무충돌 / 0.5.1 회귀 0

## P3c-2 — 길 그리기 모드 + 자동 벽 — 완료 (CHANGELOG `[0.7.0]`)

설계 모호점이었던 "Step1 carve 모드 / grid 전체 wall 시작" 안은 폐기. 사용자 mental model("에디터 내 길 도구 + 벽 생성 버튼")로 재설계.

- [x] `Tool` 타입에 `"path"` 추가 + `MAZE_TOOL_ICONS.PATH` (lucide `Route`)
- [x] `pathMarks: ReadonlySet<string>` state — grid 밖 transient 레이어
- [x] path stroke 일관성 — `pathStrokeModeRef: "set"|"clear"` (wall stroke 패턴 응용)
- [x] `RenderEngine.renderPathMark` 옵셔널 + default 엔진 구현 (lime 반투명)
- [x] `ThemePalette.pathMarkTint`
- [x] `components/maze/path-commit-button.tsx` — 길 도구 활성 + 마크 존재 시 contextual 노출
- [x] `handleCommitWalls` — start/goal 보존 + 마크 EMPTY + 그 외 WALL, marks 클리어
- [x] History 확장 `HistorySnapshot = { grid, marks }` — undo가 양쪽 복원
- [x] 불변 갱신 명시 (Set 버전: `new Set(prev)` 패턴) — history 오염 차단
- [x] 즉시 commit (모달 없음) — undo로 회복 가능
- [x] Step1·사이즈 변경·Step1 복귀 시 marks 클리어
- [x] i18n 4키 (ko/en) — toolPath / commitWallsButton / commitWallsHint + icons.ts PATH 매핑
- [ ] dev 시각 점검 — 길 stroke + 토글 / 벽 생성 commit / undo·redo grid+marks 양쪽 / 마크 위 다른 도구 페인트 시 마크 유지 / 검증·점수 commit 후 갱신 / 0.6.1 회귀 확인

## P4a — 숏링크 공유 (D1 · API) — 완료 (CHANGELOG `[0.14.0]`)

- [x] `001_maze.sql` 갱신 (ip_hash 컬럼 + 인덱스)
- [x] `wrangler.jsonc` MAZE_DB binding placeholder (prod + env.preview)
- [x] `lib/maze/share.ts` — generateShortId / isValidShortId / parseSharedPayload / isValidPayload
- [x] `storage.ts` migrate 재구조 — migrateOrNull / migrate (loadProject) / **migrateSharedPayload export** (잔손질 1)
- [x] `app/api/maze/route.ts` POST — D1 insert, 충돌 retry, IP rate limit 30s, runtime="edge" 금지
- [x] `app/tools/maze/page.tsx` — searchParams ?id + D1 fetch + parseSharedPayload + try/catch fallback
- [x] `shared-not-found.tsx` server-rendered fallback
- [x] `client-shell.tsx` sharedProject prop — hydrate/persist skip, step=2 강제, StepNav 숨김
- [x] `share-controls.tsx` — validation.ok 시 노출, POST → URL + 복사
- [x] PlayMode·WinDialog `backLabel` props — shared 모드에 "내 미로 만들기"
- [x] i18n 10키 (ko/en)
- [x] registry 여전히 coming-soon 유지 — 라이브 P4b
- [ ] **사용자 핸드오프**: `wrangler d1 create brennhub-maze`/`brennhub-maze-dev` + database_id placeholder 교체 + 마이그레이션 적용 (`--remote` 옵션)
- [ ] dev 검증 — 공유 생성·?id= 진입·rate limit·not-found fallback·shared 모드 PlayMode

## P4b — STAR_THRESHOLDS archetype 보정 + 라이브 전환 + main 머지 — 완료 (CHANGELOG `[1.0.0]`)

- [x] dev에서 archetype 6종 (빈 들판/살짝 굽은 길/적당한 미로/구불구불 외길/정통 분기 미로/크고 복잡한 미로) 만들어 `[maze score]` console.log 측정
- [x] STAR_THRESHOLDS 자문 검토 (claude 안 제시 → 사용자 확정) → SCORE_TUNING 갱신: `[0.2, 0.49, 0.71, 0.88]`
- [x] `client-shell.tsx` archetype 보정용 console.log useEffect 제거 (P3a-2 BACKLOG 항목)
- [x] `tools-registry.ts` maze status `coming-soon` → `live`
- [x] CHANGELOG `[1.0.0]` — 라이브 milestone
- [x] feat/maze → dev 머지+push (마지막 dev 점검 완료)
- [x] **feat/maze → main 머지+push** (1.0.0 정식 런칭, prod 배포)

## P5a — 제한 시간 데이터 모델 + 만들기 UI — 완료 (CHANGELOG `[1.1.0]`)

- [x] `MazeProject.timeLimitSec: number | null` 추가 (null=타이머 없음)
- [x] `SCHEMA_VERSION 3 → 4` + storage.ts migrateOrNull v3→v4 분기 (`timeLimitSec=null` 강제)
- [x] v4 검증에 timeLimitSec 가드 (null 또는 [MIN,MAX] 정수, 손상값 null fallback)
- [x] **share.ts 무수정 확인** — parseSharedPayload·isValidPayload가 migrateSharedPayload 경유, 자동 호환
- [x] `TIME_LIMIT = { MIN: 10, MAX: 900, DEFAULT: 60 }` 상수
- [x] grid.ts newProject default `timeLimitSec: null`
- [x] settings-panel 시간 제한 카드 (Switch + NumberStepper, toggle on/off 값 캐시)
- [x] client-shell `handleTimeLimitChange` 콜백
- [x] i18n 5키 ko/en (정보량 통일)
- [ ] dev 검증 — v3→v4 자동 migrate / 옛 공유 미로 ?id= 진입 / 만들기 UI toggle/stepper / 플레이 무영향 / 점수·검증 무변경

## P5b — 플레이 카운트다운 + 게임오버 + 결과 화면 + 사운드 (별도 task)

P5b 완료 후 P5a + P5b 함께 main 머지 (미완성 prod 노출 차단).

- [ ] 플레이 모드 카운트다운 UI (HUD)
- [ ] 시간 초과 시 게임오버 처리
- [ ] 결과 화면: 도착 시 걸린 시간 + 남은 제한 시간 표시
- [ ] 게임오버 사운드 ("안타까움" 톤, sound.ts 합성 확장)
- [ ] 다시 플레이 시 타이머 리셋
- [ ] `timeLimitSec=null` 미로는 카운트다운·게임오버 없음 (기존 흐름 유지)

## V2 후보 (효능감 검증 후 별도 task)

- [ ] **Trap / Key / Door 타일** — `TileType`에 정수 `4`(Trap) / `5`(Key) / `6`(Door) 확장. 잠금-열쇠 퍼즐 메커닉.
- [ ] **테마 시스템** — `MazeTheme`의 `"sprite-dungeon"` 활성화. 타일 스프라이트 세트 교체.
- [ ] **공유 API rate limit** — `maze` 저장 POST에 IP 해시 기반 rate limit (feedback `RATE_LIMIT_WINDOW_MS` 패턴 재사용).
- [ ] **인기 미로 랭킹** — `created_at` 인덱스 + 조회수/플레이수 컬럼 기반 랭킹 보드.
- [ ] **모바일 스와이프 조작** — V1은 D-pad only(정밀 1칸 이동). 스와이프는 한 swipe당 칸 수 정의가 모호해 V1 제외. 효능감 검증 후 D-pad + 스와이프 병행 검토.
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
