# 픽셀 미로 만들기 Changelog

주요 결정 / 이정표.

## [0.7.0] — 2026-05-23

### Added (P3c-2 — 길 그리기 모드 + 자동 벽 생성)

길 도구로 미로의 통로만 칠하고 "벽 생성" 버튼 한 번으로 나머지를 벽으로 채우는 워크플로 추가. 사용자 mental model: "길을 그리는 도구 + 활성 시 벽 생성 버튼 동반." 기존 벽 그리기 워크플로는 그대로.

- **길 도구 `"path"` 추가** — `Tool` 타입 확장(`"wall" | "path" | "start" | "goal"`). 팔레트에 lucide `Route` 아이콘으로 추가.
- **transient pathMarks 레이어** — `useState<ReadonlySet<string>>`. key = `"r,c"`. **`MazeProject.grid` 밖**의 별도 state, localStorage 미저장. `TileType` 4/5/6은 V2(Trap/Key/Door) 예약이라 마크에 재사용 금지.
- **path stroke 일관성** — `pathStrokeModeRef: "set" | "clear"`. pointerdown 시 시작 셀 마크 여부로 stroke 전체 set/clear 결정. wall stroke 일관성과 동일 패턴.
- **"벽 생성" 버튼 (`components/maze/path-commit-button.tsx` 신규)** — 길 도구 활성 + `pathMarks.size > 0`일 때만 노출. 클릭 시 즉시 commit (모달 없음 — undo로 회복 가능).
- **Commit 알고리즘** — `handleCommitWalls`:
  - 마크 셀     → `EMPTY`
  - `START`/`GOAL` → 보존 (마크 여부 무관, 사용자 의도된 엔드포인트 유지)
  - 그 외 셀   → `WALL`
- **마크 렌더** — `RenderEngine.renderPathMark` 옵셔널 추가, `default.ts` 구현 (lime `rgba(132,204,22,0.32)`). 셀 위 반투명 오버레이 → 다크/라이트 양쪽 자연. `maze-grid` 렌더 순서: `clearBackground → renderTile → renderPathMark(있는 셀만) → drawGridLines`.
- **History 확장 `{ grid, marks }` 양쪽 스냅샷** — path stroke / commit / 다른 도구 액션 모두 동일 push 패턴. undo가 grid·marks 양쪽 복원. localStorage 영향 0(history 비저장).
- **`ThemePalette.pathMarkTint`** — 신규 lime 컬러. start emerald · goal rose · player blue · path mark lime — 4색 모두 명확히 구분.
- **i18n 신규 4키** (ko/en) — `toolPath` / `commitWallsButton` / `commitWallsHint` + (`MAZE_TOOL_ICONS.PATH` icons map).

### Decided

- **Q1: 도구 vs 모드 → 팔레트 도구** — 모드 토글의 "현재 모드 뭐였지" 부하 회피. 기존 wall/start/goal 추가 패턴과 일관.
- **Q2: 자동 벽 범위 → (A) 길 아닌 모든 칸** — (B) 인접 1칸은 사방 뚫림 = 비-미로. (A)는 벽이 자연스럽게 "길 옆"에 생김. start/goal은 어느 경우든 보존.
- **Q3: 마크 자료구조 → `Set<string>`** — sparse 미로에 메모리 효율 + O(1) add/has/delete. RenderEngine 옵셔널 메서드로 캔버스 통합(직접 `fillRect` 금지 규약 준수).
- **Q4: marks ↔ undo → history `{grid, marks}` 통합** — 길 stroke가 grid 미변경이지만 사용자에게 undo는 stroke 단위라 통합 자연. 별도 stack 안 만듦.
- **Q5: 마크 수명 → 세션 보존 + stroke 시작 셀 토글 + commit 시 클리어 + Step1·사이즈 변경 시 클리어** — 다른 도구 잠시 사용 후 돌아와도 보존. grid 직접 편집 시 자동 정리 X — 시각화로 정직.
- **Commit 모달 없음** — 즉시 실행 + undo 회복. 모달은 마찰.
- **검증·점수가 마크 미반영** — 길 도구 사용 중엔 현 grid 기준 표시 (정직). commit 후 갱신. 버그 아님.
- **불변 갱신 명시 (Set 버전)** — `setPathMarks((prev) => new Set(prev))`. in-place `.add()`/`.delete()` 금지 — (a) 리렌더 안 됨, (b) history snapshot의 같은 Set 참조 오염으로 undo 엉뚱. 빌드로 안 잡힘 — 주석 명문화.

### Notes

- 길 도구는 드래그 지원 (wall과 동일). pointerdown 시 시작 셀 모드 1회 결정.
- 점수 알고리즘 / SCORE_TUNING / fog / Step3 / P3b play.ts·play-canvas — 무변경 (회귀 0).
- `MazeProject.grid` 외 state(pathMarks)는 의도적으로 영속 비대상 — 페이지 새로고침 시 마크 사라짐, grid는 복원. 사용자 의도("그리고 commit") 흐름과 일치.

## [0.6.1] — 2026-05-23

### Removed

- **지우개 도구** — 벽 재클릭 토글(0.6.0)이 벽 지우기를 대체하므로 불필요. 깔끔 제거:
  - `Tool` 타입에서 `"eraser"` 제외.
  - `ToolPalette`의 eraser 버튼 제거.
  - `handlePaint`의 eraser 분기 제거.
  - i18n `maze.toolEraser` 키 제거 (Messages 타입 + ko/en).
  - grep 잔여 0 확인. `activeTool` 초기값은 `"wall"`이라 eraser로 fallback 경로 없음.

### Changed

- **초기화 버튼 아이콘** — `Trash2` → `RefreshCw`. "초기화 = 처음으로 돌리기" 의미가 휴지통보다 정확.
- **시작점 아이콘 정합** — 도구 팔레트 시작점 = `Smile` → `User`. P2.1 렌더러가 캔버스에 그리는 `User` 아이콘과 동일. 도착점은 둘 다 `Flag`로 이미 일치.
- **공유 아이콘 상수** `lib/maze/icons.ts` — `MAZE_TOOL_ICONS` map(WALL/START/GOAL). 도구 팔레트와 렌더러(`lib/maze/render/icons.ts` iconNode)는 출력 형식이 다르지만 둘 다 lucide-react v1.14.0 단일 출처라 시각 일관 자동. V2에서 아이콘 교체 시 두 곳을 함께 갱신해야 함을 주석에 명문화.

### Notes

- handlePaint 로직 / undo·redo / 초기화 / 점수 / fog / Step3 — 모두 무변경 (회귀 0).
- 패치 버전 — 신규 기능 0, UI 정리만.

## [0.6.0] — 2026-05-23

### Added (P3c-1 — 에디터 UX: undo/redo · 벽 재클릭 토글 · 초기화)

- **Undo/Redo (stroke 단위)** — `client-shell.tsx`에 `GridHistory = { past, future }` 상태 추가. stroke 시작(pointerdown=`isInitial=true`) 시 1 entry push, drag 중(pointermove)은 무변경. `HISTORY_DEPTH = 100` (≈3~4MB 최악, 64×64 packed 아닌 JS 2D 배열 기준). 키보드: `Ctrl+Z` undo / `Ctrl+Y`·`Ctrl+Shift+Z` redo (Cmd 동일). 키보드 핸들러는 Step2 mount/unmount — Step3 방향키와 충돌 0. 모바일은 신규 `EditorControls` 화면 버튼이 유일 진입점.
- **벽 재클릭 토글** — wall 도구: 빈 셀 클릭 → WALL, WALL 셀 클릭 → EMPTY. **stroke 일관성**: pointerdown 시점에 시작 셀 값으로 stroke 전체 fill을 결정(WALL 또는 EMPTY), pointermove는 그 값을 그대로 적용 — per-cell 토글의 드래그 엉킴 차단. 시작 셀이 START/GOAL이면 stroke=WALL (기존 호환). `useRef<TileType>`로 stroke 동안 fill값 보관.
- **그리드 초기화 버튼** — Step2 유지하며 grid만 EMPTY로. `EditorControls`의 휴지통 버튼 → 확인 모달 → 실행. **undo 가능** (history entry 1개로 push).
- **`components/maze/editor-controls.tsx` (신규)** — undo/redo/초기화 row. 좌측 undo·redo + 우측 초기화 (`justify-between`). flex-wrap 모바일 줄바꿈. 아이콘만(모바일) / 아이콘+라벨(`sm:` 이상).
- **`ResetConfirmDialog` props 일반화** — `title`/`message`/`confirmLabel` 옵셔널 추가. 미지정 시 기존 maze.reset* 키 사용(기존 호출부 무변경). 신규 그리드 초기화 모달은 `resetGrid*` 키 전달.
- **i18n 신규 6키** (ko/en) — `editorUndo` / `editorRedo` / `editorResetGrid` / `resetGridTitle` / `resetGridMessage` / `resetGridConfirm`.

### Changed (handlePaint 재작성)

- **불변 갱신 명시** — `project.grid` 절대 in-place mutate 금지. 항상 `cloneGrid` 후 mutate, 새 객체로 set. 이유: (a) `score`/`validation` `useMemo`가 grid 참조 불변이면 캐시되어 패널이 라이브 갱신 안 됨, (b) `history.past`에 저장된 grid 참조가 in-place mutate되면 스냅샷 오염으로 undo가 엉뚱한 상태 복원. **빌드로는 안 잡히는 종류** — 주석에 명문화.
- **No-op 가드** — 실제 grid 변경 없으면 history push와 setProject 모두 skip. 시작점 동일 셀 클릭·이미 같은 fill 셀 페인트 등 idempotent 액션이 history를 더럽히지 않게.
- **도구별 stroke 일관성 명문화** — wall만 stroke 시작 셀 기반 toggle, 나머지 도구(eraser/goal/start)는 단순 액션.

### Decided

- **stroke = 1 undo entry** (셀별 X) — 사용자 명세. drag로 100칸 칠해도 undo 한 번이면 stroke 전체 취소. UX 직관 일치.
- **HISTORY_DEPTH = 100** — 100 × ~32KB = ~3~4MB 최악. 디자인 1회분 메모리로 무시 가능. (1차 4KB 계산은 packed byte 가정 오해 — JS 2D number 배열은 packed 아님.)
- **사이즈 변경 / Step1 복귀 시 history clear** — 다른 사이즈 grid 참조하는 stroke는 복원 불가, 깨끗이 비움. `handleStart` / `handleConfirmReset`에 `setHistory(EMPTY_HISTORY)`.
- **그리드 초기화도 history entry** — undo 가능. 사용자가 실수로 초기화해도 회복.
- **키보드는 Step2 한정 mount** — Step3에서 Ctrl+Z 눌러도 무반응 (play-controls의 방향키 모드와 분리). Step3 mount 후 Step2로 돌아오면 keydown 재바인딩.
- **벽 stroke 일관성 = 시작 셀 기준** — per-cell 토글이면 wall→empty→wall→… 같은 셀 위 드래그가 엉킴. 시작 셀 1회 결정으로 의도 명확.
- **wall 위에 start/goal 도구**: 기존 호환 — wall 덮어쓰기. eraser/wall로만 wall 직접 제거.

### Notes

- 길 그리기 모드 + 자동 벽(항목 7) → **P3c-2** 별도 task. 본 패치 미구현.
- 점수 알고리즘 / `SCORE_TUNING` / fog 렌더 / Step3 게이팅 — 무변경 (회귀 0 보장).
- archetype 보정용 콘솔 신호는 그대로 — P4 live 전 제거 항목 유지.

## [0.5.1] — 2026-05-23

### Fixed (P3a-2 후속 교정 — 어긋난 것 3건)

- **검증/점수 패널 위치 — 그리드 위 → 아래**. 패널 높이가 바뀔 때(✗ ↔ 통과 ↔ weakness 펼침/접힘)
  그리드가 위아래로 밀려 사용자가 그리던 셀 위치를 잃던 문제 해소. `client-shell.tsx` Step2 분기에서
  `<ValidationPanel>`을 `<MazeGrid>` 뒤로 이동.
- **Fog of War 원형 렌더 — 셀 양자화 제거**. 기존 셀 단위 `(r-pr)² + (c-pc)² ≤ R²` 가드는 작은
  반경에서 십자/계단 모양으로 각져 보였음. `play-canvas.tsx` fog ON 분기를 **픽셀 단위 `ctx.arc + ctx.clip()`** 로
  재작성 — player 셀 중심에서 `fogRadius × cell` 픽셀 반경의 진짜 원형. 단위 "칸" 의미는 그대로 유지(UX 변화 0).
- **도착점 도구 동작 정리**:
  - 드래그 금지 → **클릭 1회 = 깃발 1개** (기존엔 벽처럼 드래그로 연속 배치).
  - 기존 깃발 재클릭 시 삭제 (토글).
  - 시작점(드래그로 1개 이동)·벽·지우개(드래그)는 현행 그대로.

### Changed (구조)

- **`MazeGrid.onPaint` 시그니처 확장**: `(r,c) → (r,c,isInitial: boolean)`. `pointerdown`은 `true`,
  `pointermove`는 `false`. `client-shell.handlePaint`가 도구별로 드래그 허용 여부 판단 (현재는 goal만 차단).
- **`play-canvas.tsx` 렌더 분기 단순화** — fog ON 시 셀별 `visible()` 가드 + fog 전용 grid-line 셀별
  루프 **둘 다 제거**. 클립이 자르므로 fog ON/OFF 모두 동일한 `renderAll()`(clearBg → tiles → player → gridLines)을
  호출, fog ON 분기는 그 호출을 `ctx.save() / arc / clip / restore`로 감싸기만.

### Decided

- **fog 원형 = Canvas Clip 마스크** (옵션 A 셀 가드 / 옵션 C globalCompositeOperation 대비). 진짜 원형 + 코드 단순화 둘 다.
- **반경 정의 `radius_px = fogRadius * cell`** — "칸" 단위 의미 유지. 기존 값(1·3·6)에서 사용자 UX 변화 없음.
- **`isInitial` flag 패턴** — maze-grid가 activeTool을 알 필요 없게 client-shell이 도구별 정책 결정.
  V2에서 다른 도구(트랩·열쇠 등)도 드래그 금지하려면 같은 분기 한 줄 추가로 가능.

### Notes

- fog는 순수 시각 — 이동·충돌·BFS·점수 로직 영향 0 (`play.ts`/`grid.ts`/`validate.ts` 무변경).
- 점수 알고리즘/임계값 보류 (P3a-2 1차안 그대로). archetype 실측 보정은 별도 task.
- 에디터 UX 신규 기능(undo/redo·벽 재클릭 삭제·초기화·길 그리기 모드)은 P3c 별도 task — 본 patch에서 미구현.

## [0.5.0] — 2026-05-22

### Added (P3a-2 — 미로 품질 점수 시스템)

완결성 검증(P3a) 통과 위에 ★1–5 품질 점수를 얹는다. 벽이 허술하게 뚫린
미로에 무의미한 "플레이 가능 ✓"가 뜨던 문제 해결.

- **`lib/maze/validate.ts` `scoreMaze(grid)`** — 순수 결정론 점수 산출.
  완결성 통과 시에만 호출 전제(validation.ok). 빈 grid·예외 케이스는 null.
- **차원 A — 경로 우회도**: BFS 최단경로(시작→가장 가까운 도달 가능 도착점)
  / 맨해튼 거리. 1차안 saturation = 4(직선 4배 우회 시 만점).
- **차원 B — 복도성 base × 텍스처 보너스**: 통과 셀 중 degree ≤ 2 비율
  (corridor) × (0.5 + 0.5 × 텍스처 정규화). 텍스처 = (junction + 진짜
  막다른 길) / passable, saturation = 0.15. **"진짜" 막다른 길 = degree==1
  AND tile ∉ {START, GOAL}** — 구조적 끝과 가짜 막다른 길 분리.
- **합성 = sqrt(A × B)** — 단순 기하평균. "둘 다 있어야 점수" 구조.
  가중치 가산식·가중 기하평균은 우세 차원이 약한 차원을 보상해 외길 > 미로
  역전을 유발 → 폐기.
- **트리비얼 가드** — manhattan ≤ 1(시작·도착 인접) 강제 ★1, weakness=low-detour.
- **약점 식별** — 우선순위 detour < corridor < texture, 임계값 0.30 미만 1개 표시.
- **튜닝 상수 한 블록 `SCORE_TUNING`** — 본 블록만 수정하면 점수 분포 변경.
  로직 재작업 없이 dev 실측 후 임계값 보정 가능 (BACKLOG 항목).
- **UI** `validation-panel.tsx` 개정 — 통과 시 헤드라인을 별점(Lucide Star × 5,
  filled/outline) + "플레이 가능" 보조 마크로 교체. 차원 바 3개(detour/
  corridor/texture, 진행률 + 0.00 raw 값) + weakness 안내(amber, 있을 때만).
  미통과 분기는 P3a 원안 유지(✗ + 사유 + 펼침).
- **`client-shell.tsx`** — `useMemo(scoreMaze, [grid, validation.ok])` 추가.
- **i18n** — `scoreLabel`·`scoreStarsAria`·`scoreDim*` 5개 + `weak*` 3개
  = 8키 (ko/en).

### Decided

- **점수는 게이팅 아님** — Step3 활성 조건은 `validation.ok` 그대로. 점수는
  보여주기만. 공유·플레이 차단 의도 없음 — 디자이너의 자유.
- **차원 B에서 `count(degree≥3)` 직접 사용 폐기** — 빈 들판이 거의 전 셀
  degree 3~4라 갈림길 만점을 받아버림(튜닝으로 못 고침). corridor base가
  지배해야 빈 들판 = 0 보장.
- **합성 = sqrt(A × B)** 채택, 가산식 `A·0.6 + B·0.4` 폐기. 가산식은 외길
  (A=1, B=0.5)=0.80이 미로(A=0.7, B=0.77)=0.728보다 높은 역전 발생 →
  STAR_THRESHOLDS·WEIGHT 조정으로 못 고침.
- **`STAR_THRESHOLDS = [0.20, 0.40, 0.72, 0.85]`** 1차안 — 외길 0.707과
  미로 0.734 사이 0.027 폭에 ★3/★4 경계(0.72)를 끼움. **fragile** — dev
  archetype 4개 실측 후 보정 필수 (BACKLOG).
- **이중 BFS** — `validateMaze`의 reachability BFS(boolean 종결)와
  `scoreMaze`의 distMap BFS는 분리. 64×64 추가 1회 BFS = µs, 합치는 복잡도
  > 절약 비용.

### Notes

- 점수도 순수 결정론(BFS + degree 집계) — AI 미사용.
- 등급에 flavored 네이밍(★1=들판/★5=고문실 등)은 별도 task로 BACKLOG —
  점수 공식 튜닝 안정화 후 진행.
- 시각 점검 archetype: 빈 들판/벽 허술/외길 복도/제대로 된 미로 — total 실측 비교 후 임계값 보정.

## [0.4.0] — 2026-05-22

### Added (P3b — 플레이 모드 + Fog of War)

- **`lib/maze/play.ts`** — 순수 결정론 게임 상태. `PlayState`/`Dir`/`Pos` 타입 + `initialPlayState`(시작점 검색, 없으면 null) + `applyMove`(clamp + WALL 차단 + 승리 체크) + `isWin`.
- **`lib/maze/grid.ts` `isPassable` 헬퍼** — 단일 통과성 술어. BFS(validate)와 플레이어 이동(play)이 같은 정의를 공유 → 드리프트 차단. validate.ts의 인라인 isPassable 제거 + 헤더에 명문화.
- **`lib/maze/render/{types,default}.ts`** — `ThemePalette` 확장: `playerTint`/`playerIcon`(blue). `RenderEngine`에 `renderPlayer` 메서드 추가(필수). default 엔진은 `User` 아이콘 그대로(시작점과 동일 — 같은 사람) + blue 색 구분.
- **StepNav 3-step 확장** — `Step = 1|2|3`, `labels: [string,string,string]`, `disabledSteps?: readonly Step[]`. 검증 미통과 시 `[3]` disabled.
- **`components/maze/play-canvas.tsx`** — 플레이 렌더 (3-단계: 배경 → 시야 안 셀별 renderTile → renderPlayer → grid lines). fog ON일 때 검정 배경(#000) + 시야 안 셀만 렌더 + **격자선도 시야 안 셀만 stroke** — blackout 영역에 grid 패턴 비치지 않게.
- **`components/maze/play-controls.tsx`** — D-pad(데스크탑·모바일 공통) + 키보드 핸들러(방향키/WASD). 방향키 입력 시 `e.preventDefault()` — 페이지 스크롤 차단. modifier 키 조합은 무시.
- **`components/maze/win-dialog.tsx`** — 승리 모달 (ResetConfirmDialog 패턴 재사용). "다시 플레이" / "편집으로 돌아가기".
- **`components/maze/play-mode.tsx`** — Step3 컨테이너. project props 단일 진입점(P4 공유 진입도 같은 인터페이스로 재사용). 자급 PlayState. grid 변경 시 자동 reset(useEffect).
- **`client-shell.tsx`** — Step3 라우팅. StepNav `disabledSteps={validation.ok ? undefined : [3]}`. Step3 → Step2 복귀는 reset 다이얼로그 없이 즉시.
- **i18n** — `maze.step3` + `maze.play*`/`maze.win*` 키 11개 (ko/en).

### Decided

- **Step3 신규 (UX)** — 풀스크린 오버레이/inline 토글 대신 기존 step-by-step 패턴 일관. P4 공유 진입은 Step3 직행 가능, 편집↔플레이 토글 자연.
- **모바일 조작 = D-pad only** — 스와이프는 정밀 1칸 이동에 부적합(한 swipe = 몇 칸?). D-pad는 데스크탑에도 표시(키 모르는 사용자 가이드 + 입력 보조). 스와이프는 V2 후보.
- **Fog = 하드 엣지 원형** — 셀 좌표 `(r-pr)² + (c-pc)² ≤ fogRadius²` 정수 비교. 그라데이션은 "픽셀 미로" 미학과 충돌. fog ON 시 격자선도 시야 안 셀만 stroke → blackout 강조.
- **플레이어 마커 = User 아이콘 + blue** — 시작점(emerald)·도착점(rose)과 명확히 구분. 시작점 셀 마커는 보존(사용자 출발점 기억 도움), 플레이어는 위 layer.
- **통과성 단일 헬퍼** — `lib/maze/grid.ts` `isPassable(tile)`이 단일 출처. BFS·이동 둘 다 호출 → "BFS == 이동" 구조적 보장. V2 신규 타일 추가 시 한 곳만 갱신.
- **applyMove 차단 시 동일 객체 반환** — 새 객체 생성 없이 같은 state 반환 → 불필요한 React 리렌더 차단.
- **WinDialog ESC = 편집 복귀** — 덜 파괴적인 기본 동작(restart는 상태를 잃음).
- **플레이어블 상태는 localStorage 미보존** — `MazeProject`(에디터 작업본)만 보존, `PlayState`는 세션 메모리. 새로고침 시 grid는 Step2로 복원, 플레이는 다시 시작.

### Architecture

- **PlayMode 단일 진입점** — P4 공유 진입 재사용 위해 `<PlayMode project={...} onBackToEdit={...} />` 인터페이스 고정. P4는 short_id로 fetch한 project를 같은 props로 넘긴다.
- **RenderEngine 인터페이스 확장 = 필수 메서드 추가** — `renderPlayer`는 옵셔널 아님. V2 sprite-dungeon 가설 엔진도 구현 필요. P2.1 "변경 0 주장은 ready 훅 노출 전제" 원칙과 동일 — silent oversell 방지 명문화.

### Notes

- 플레이 모드·이동·충돌·승리·fog 시야 모두 **AI 미사용 순수 결정론** (BRENNHUB.md §3).
- 빈/이상 grid 안전 가드 — `initialPlayState`가 null이면 PlayMode가 `playNotReadyHint` 메시지 표시. StepNav `disabledSteps`로 사실상 도달 차단되지만 방어 fallback.
- 숏링크 공유 P4, registry `coming-soon` → `live` 전환 P4. 본 단계 미포함.
- API route 미생성 — `runtime = "edge"` 이슈 무관.

## [0.3.0] — 2026-05-22

### Added (P3a — 완결성 검증 시스템)

- **`lib/maze/validate.ts`** — 순수 결정론 함수 `validateMaze(grid)` + `ValidationResult` 타입. 4방향 BFS(passable: EMPTY/START/GOAL, blocked: WALL).
- **검증 규칙**:
  - 규칙1(엔드포인트) — 시작점 정확히 1개 + 도착점 1개 이상. 실패 code: `no-start` / `multiple-starts` / `no-goal`.
  - 규칙2(외곽 폐쇄) — **boundary clamp으로 자동 충족**, 명시 체크 없음. validate 모듈 헤더에 명문화.
  - 규칙3(도달성) — 시작점에서 도착점 최소 1개 도달 가능. 실패 code: `unreachable-goals`. endpoints 미통과 시 `skipped`로 보류.
- **`components/maze/validation-panel.tsx`** — Step2 도구 팔레트 아래·그리드 위 배지. 통과(녹색) / 실패(빨강 + critical 사유 + 펼침 시 규칙별 ok/사유).
- **`client-shell.tsx`** — `useMemo(() => validateMaze(project.grid), [project.grid])` 라이브 재계산. 64×64 BFS 비용 무시 가능(µs).
- **i18n** — `maze.validation*` 키 12개 (ko/en).

### Decided

- **규칙2 = boundary clamp 자동 충족** — 옵션 A 채택. 외곽 EMPTY 강제하면 16×16조차 60칸 수동 마감 필요(64×64=252칸) → UX 마찰 > 이득. 플레이어 좌표가 BFS·이동 모두 `[0, size-1]` clamp이라 grid 밖 탈출이 물리적으로 불가능, 기획서 의도("맵 밖으로 나가는 구역 없음")는 결과적으로 동일 달성. silent oversell 방지 위해 validate 헤더에 명문화.
- **P3b 이동 규약 (지금 확정)** — 플레이어 이동은 `r,c`를 `[0, size-1]` clamp + WALL cell 진입 차단. 외곽 EMPTY는 통과 가능. BFS 통과성 == 이동 통과성 일치 유지가 검증 시스템의 의미를 보장.
- **라이브 재계산** — `useMemo(grid)` 의존성, debounce·버튼 없음. BFS 비용이 화면 그리기보다 훨씬 가벼움.
- **endpoints 미통과 시 reachability = skipped** — UI에서 사용자가 사유 두 개를 동시에 보지 않게 분리. RuleResult code에 `skipped` 식별자 추가.
- **AI 미사용** — 검증은 순수 결정론 (BRENNHUB.md §3 "결정론적 계산을 AI보다 우선").

### Notes

- 검증 패널 위치는 Step2 한정. Step1(설정)에서는 grid가 빈 배열이라 검증 의미 없음.
- 빈 grid(`[]`) 입력 시 `validateMaze`는 endpoints `no-start` + reachability `skipped`로 안전 반환 — Step2 진입 직후 첫 렌더에도 크래시 없음.
- 플레이 모드·플레이어 이동·fog 렌더는 P3b, 숏링크 공유는 P4. 본 단계 미포함.
- API route 미생성 — `runtime = "edge"` 이슈 무관.

## [0.2.1] — 2026-05-22

### Fixed (P2 시각 검증 회귀 — dev 점검에서 발견)

- **start/goal 타일 아이콘 렌더링** — `fillRect` 단색 → Lucide `User`(시작점) + `Flag`(도착점) 아이콘 stroke + 옅은 배경 틴트 병행. 기획서 V1 매핑 일치.
- 64×64(셀 ~8px) 가독성 — 아이콘 시각 stroke ≥1.25px 보장 + 틴트가 식별 보조.

### Added (렌더러 추상화)

- **`lib/maze/render/`** — 4-파일 구조:
  - `types.ts` — `RenderEngine` / `TileRenderer` / `ThemePalette` / `RenderRect`. 옵셔널 `ready?: () => Promise<void>` 훅 (V2 비동기 에셋 로드용).
  - `icons.ts` — lucide-react v1.14.0 iconNode 직접 임베드(User/Flag) + `pathFromNode` 변환 + `getIconPaths` WeakMap 캐시. ISC 출처 표기.
  - `default.ts` — `createDefaultEngine(dark)` V1 구현 + `strokeIcon` Path2D 헬퍼.
  - `index.ts` — `selectEngine(theme, dark)` 진입점. V2 `sprite-dungeon` 분기 자리.
- **`components/maze/maze-grid.tsx` 재배선** — 인라인 `fillRect`/`stroke` 제거, `engine.clearBackground` → 셀별 `engine.renderTile` → `engine.drawGridLines` 3-단계. `MazeTheme` prop 추가, `await engine.ready?.()` + cancel 가드.
- **`app/tools/maze/client-shell.tsx`** — `<MazeGrid theme={project.theme}>` prop 추가.

### Decided

- **Path2D 동기 렌더** — `drawImage(SVG dataURL)` 미사용 (async preload 회피, flicker 0). 동기 strokeStyle로 테마 색 즉시 적용.
- **lucide iconNode 직접 임베드** — 근사·재구성 없이 lucide-react v1.14.0 소스 그대로. 라이브러리 업데이트 시 같은 형식으로 동기화 가능.
- **start 아이콘 = `User`** (`PersonStanding` 대안 검토) — head circle + shoulders 2-원소 silhouette이 작은 셀에서 더 명료.
- **lineWidth 적응 = `Math.max(2, 1.25/drawScale)`** — `drawScale = (cell·0.8)/24` (10% inset). 큰 셀은 Lucide 네이티브 2 유지, 작은 셀(cell=8)도 시각 stroke ≥1.25px 보장. 도출식은 default.ts 인라인 주석.
- **틴트 = 양 테마 공통 alpha** (`rgba(22,163,74,0.18)` / `rgba(225,29,72,0.18)`) — bg 블렌딩으로 light/dark 모두 자연.
- **아이콘 색은 테마 분기** — light=`*-600` / dark=`*-400` (대비 확보).
- **DPR 변환 외부 1회 설정** — 엔진 메서드는 `ctx.setTransform` 호출 금지(규약, RenderEngine 주석 명시). 로컬 변환은 save/translate/scale/restore로만 — DPR 보존.
- **`tile satisfies never` 분기 가드** — V2 신규 타일(4/5/6) 추가 시 TS가 default 분기에서 에러를 내 강제 처리.

### Notes

- V2 `sprite-dungeon` 엔진은 비동기 스프라이트 시트 로드가 필요할 가능성 — `ready?` 훅으로 처리. maze-grid는 이미 `await engine.ready?.()` + cancel 가드 — V2 추가 시 maze-grid 변경 0(단 새 엔진이 ready 훅을 노출하는 것이 전제).
- 인터랙티브 시각은 dev 재배포 후 사용자 점검.

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
