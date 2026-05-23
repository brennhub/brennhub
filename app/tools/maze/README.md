# 픽셀 미로 만들기 — `/tools/maze`

> UI 표시명은 "픽셀 미로 만들기" (en "Pixel Maze Maker"). 코드 식별자(slug `maze`, registry id, `TileType`/`MazeProject` 타입, 파일 경로)는 불변.

픽셀 격자 위에 미로를 설계하고, 시야 제한(Fog of War)으로 플레이하며, 숏링크로 공유하는 도구.

## 목적

게임 세계관 제작자·퍼즐 디자이너·창작자가 정해진 미로가 아니라 자기만의 미로를 0부터 설계하고, 시야 제한 플레이로 검증한 뒤 짧은 링크로 공유할 수 있도록 한다. 픽셀 단위로 벽·길·시작점·도착점을 찍고, 16·32·64 정사각 격자 중 선택하는 흐름.

출처: 외부 기획서 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## 화면 구조 (V1 — 2-step, 0.8.0 P3d 통합)

### Step 1 — 만들기 (설정 + 그리기 + 검증·점수, 한 화면)

**그리드 위 (고정 높이만)**:
- **SettingsPanel** — 가로·세로 NumberStepper(DIM_MIN=3 / DIM_MAX=128) + 정사각 프리셋 [16×16][32×32][64×64] + Fog of War 토글 + 시야 반경(1~6). 비정사각(50×150 등) 지원 (0.11.0).
  - 사이즈 변경: 스테퍼는 local pending state로 편집 → 명시 [적용] 버튼이 확정 (스테퍼 +/− 단발마다 다이얼로그 뜨는 것 차단). 프리셋 클릭은 즉시. 비어있지 않은 grid면 ResetConfirmDialog → 확정 시 `{ width, height, grid, history, marks, view }` 모두 새로. 빈 grid면 즉시. fog 토글·반경은 grid 영향 0이라 항상 즉시.
- **ToolPalette** — 도구 4종(벽 / **길** / 시작점 / 도착점). 0.6.1에서 지우개 제거(벽 재클릭 토글이 대체). 시작점 아이콘 = Footprints (0.7.1 — 플레이어 User와 시각 분리).
- **EditorControls** — undo / redo / 그리드 초기화(휴지통).

**MazeGrid** — 위치 고정 핵심. 위·아래 어느 쪽도 그리드를 밀지 않게. **줌·팬**(0.9.0 P3e-1): 32·64맵에서 휠·핀치·+/− 버튼으로 확대/축소. 줌인 한계 = 16맵 셀 크기, 줌아웃 한계 = 현 그리드 fit. 16맵은 컨트롤 비활성. 팬: 스페이스+드래그(데스크탑) / 2 손가락(모바일) / 손도구(✋) 토글. 캔버스 우상단 컨트롤 오버레이.

**그리드 아래 (가변 / contextual)**:
- **PathCommitButton** (contextual, 길 도구 + 마크 존재 시) — 클릭 시 마크=EMPTY / start·goal=보존 / 그 외=WALL. 1 undo entry, Ctrl+Z 회복.
- **완결성·품질 패널** — 라이브 배지. 미통과: ✗ + critical 사유. 통과: 별점 ★1–5 + 차원 바 3개(경로 우회도/복도성/갈림길·막다른 길) + 약점 안내(있을 때만). 점수는 게이팅 X — 플레이 활성 조건은 완결성 통과만.

**도구별 동작**:
- 시작점은 1개(새로 찍으면 이동, 드래그 가능). 도착점은 여러 개 — **클릭 1회 = 깃발 1개**(드래그 금지), 기존 깃발 재클릭 시 삭제.
- **벽 재클릭 토글** — 빈 칸 클릭 → 벽, 벽 클릭 → 빈 칸. 드래그 일관성: pointerdown 시작 셀 값으로 stroke 전체 fill 결정.
- **길 도구** — 통로만 칠하면 lime 마크 transient 오버레이. "벽 생성" 버튼이 그리드 아래에 노출.
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` (Cmd 동일) 또는 화면 버튼. **stroke 단위 1 entry**. 만들기 단계 한정 (플레이는 방향키만).
- **그리드 초기화** — 휴지통 버튼 → 확인 모달 → grid empty (사이즈·fog 유지). undo 가능.

### Step 2 — 플레이

- 검증 통과 시에만 활성화 (StepNav `disabledSteps={[2]}`).
- 시작점에서 출발, 4방향 이동. 키보드(방향키 / WASD) + 화면 D-pad(데스크탑·모바일 공통).
- 이동 규약: `r,c`를 `[0, size-1]` clamp + WALL 진입 차단 + EMPTY/START/GOAL 통과. **BFS(검증)와 동일한 `isPassable` 단일 헬퍼 호출** — 통과성 정의 공유.
- 도착점 도달 시 승리 모달 → 다시 플레이 / 편집으로 돌아가기.
- **시작점 vs 플레이어 시각 분리** (0.7.1) — 시작점 타일 = Footprints(남은 자국, 보존), 플레이어 마커 = User(움직이는 사람). 출발점에서 떠난 메타포.
- Fog of War가 켜져 있으면 플레이어 주변 `fogRadius` 칸 원형 시야만 밝게, 나머지는 암전. 격자선도 시야 안 영역에서만 표시.

## 기술 스택

| 항목 | 채택 |
|---|---|
| 프레임워크 | Next.js 16 App Router |
| 스타일 | Tailwind v4 (CSS-first) |
| 렌더 | React Client Component (`"use client"`) + `<canvas>` 픽셀 격자 |
| 영속 (작업본) | localStorage (schemaVersion 마이그레이션) |
| 공유 저장 | Cloudflare Workers + D1 — `short_id` 숏링크 |

다른 도구(stock-sim, supp-plan, language-maker)와 동일 스택. 별도 백엔드 운영 X.

> **공유 저장 note** — 작업 중인 미로는 localStorage에 둔다. 공유 시점에만 `MazeProject`를 JSON으로 직렬화해 D1 `maze` 테이블에 `short_id`(6자)로 저장하고, `/tools/maze?m=<short_id>` 형태의 숏링크를 발급한다. 피드백 시스템과 동일하게 Workers + D1만 사용 — 별도 인프라 없음.

## 데이터 구조

아래 타입이 **canonical** — 에디터·storage·share 레이어가 이 정의를 상속한다.

```typescript
// lib/maze/types.ts (구현 완료 — 본 README가 canonical 출처)
export const SCHEMA_VERSION = 1;

// 타일은 정수로 저장한다. 64×64 격자를 문자열 유니온("wall" 등)으로 두면
// 직렬화된 JSON payload가 ~4배 커져 숏링크 경량화 목표와 충돌한다.
// → 저장 포맷은 정수 고정. 매핑 레이어 없이 저장값이 곧 타일 정수.
// 코드 가독성은 명명 상수(TILE)로만 해결한다.
export const TILE = {
  EMPTY: 0, // 길
  WALL: 1,  // 벽
  START: 2, // 시작점
  GOAL: 3,  // 도착점
  // V2: TRAP: 4, KEY: 5, DOOR: 6
} as const;

export type TileType = 0 | 1 | 2 | 3; // V2: | 4 | 5 | 6

// 정사각 격자 한 변 칸 수 — 3종 고정 (기획서 사양).
export type MazeSize = 16 | 32 | 64;

// V1은 "default"만 사용. "sprite-dungeon"은 V2 테마 시스템.
export type MazeTheme = "default" | "sprite-dungeon";

export type MazeProject = {
  id: string;              // 숏링크 발급용 식별자 (P4 공유)
  schemaVersion: number;   // localStorage 마이그레이션용
  size: MazeSize;          // 정사각 한 변 칸 수 (16 | 32 | 64)
  fogOfWar: boolean;       // 시야 제한 모드 (P3 fog 렌더)
  fogRadius: number;       // fogOfWar=true일 때 가시 반경 (칸, 1~6)
  theme: MazeTheme;        // V1 = "default" 고정
  grid: TileType[][];      // [size][size] 정수 격자 (Step1 단계엔 빈 배열)
};
```

> **타일 정수 저장 결정** — 숏링크는 payload가 작을수록 유리하다. 64×64 = 4096칸을 `"wall"`/`"empty"` 같은 문자열로 직렬화하면 정수 대비 약 4배. 저장 포맷을 정수로 고정하고, 매핑 레이어(`"wall" ↔ 1`)는 두지 않는다 — 저장값이 곧 정수, 가독성은 `TILE` 명명 상수로만 확보.

> **Fog of War는 canonical 타입에 포함** — 기획서상 MVP 기능(기능 3)이므로 `fogOfWar`/`fogRadius`를 처음부터 `MazeProject`에 둔다. fog 렌더(P3)에서 필드 추가로 인한 schema 마이그레이션을 피하기 위함.

> **규칙2(외곽 폐쇄) = boundary clamp 자동 충족** — 검증 모듈에서 명시 체크 없음. 플레이어 좌표가 BFS·이동 모두 `[0, size-1]` clamp이라 grid 밖 탈출이 물리적으로 불가능. 기획서 의도("맵 밖으로 나가는 구역 없음")는 결과적으로 동일 달성. 외곽이 EMPTY인 경우 BFS 통과성 == P3b 이동 통과성으로 일관 (검증의 통과는 곧 플레이 가능성과 일치).

## 공유 저장 (D1)

`migrations/001_maze.sql` — `maze` 테이블:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `short_id` | `TEXT PRIMARY KEY` | 6자 숏링크 ID (`CHECK length = 6`) |
| `payload` | `TEXT NOT NULL` | `JSON.stringify(MazeProject)` |
| `created_at` | `INTEGER NOT NULL` | epoch ms |

binding 명은 `MAZE_DB` (예정). **마이그레이션 SQL 파일만 존재** — D1 데이터베이스 생성, `wrangler.jsonc` binding 배선, 마이그레이션 적용은 공유 API route를 붙이는 P4 task로 이연한다. (`wrangler.jsonc` 확인 결과: `d1_databases` 블록은 top-level + `env.preview` 양쪽에 존재 — 신규 binding 추가 시 양쪽 모두에 명시 필요.)

## 차별점 · 확장 계획

- **차별점** — 정해진 미로 풀이가 아니라 픽셀 단위 직접 설계 + 시야 제한 플레이 + 숏링크 공유. 게임 세계관·퍼즐 제작 용도.
- **V2 후보** — Trap/Key/Door 타일, 테마 시스템(`sprite-dungeon`), 공유 API rate limit, 인기 미로 랭킹. 상세 [BACKLOG.md](./BACKLOG.md).

## 파일 구조

```
app/tools/maze/
  README.md / BACKLOG.md / CHANGELOG.md   # P1 완료
  migrations/001_maze.sql                  # P1 완료 — D1 공유 테이블
  page.tsx                                 # P2 완료 — Server Component shell
  client-shell.tsx                         # P2 완료 + P3a useMemo + P3b Step3 라우팅
lib/maze/
  types.ts                                 # P2 완료 — TileType / MazeProject + 상수 (위 canonical)
  grid.ts                                  # P2 완료 + P3b isPassable 단일 헬퍼 — 격자 헬퍼 + 통과성 단일 출처
  storage.ts                               # P2 완료 — localStorage load/save/migrate
  icons.ts                                 # 0.6.1 — 도구 팔레트 아이콘 단일 출처 (렌더러와 cross-ref)
  validate.ts                              # P3a + P3a-2 완료 — 완결성 검증 + 미로 품질 점수 (SCORE_TUNING)
  viewport.ts                              # P3e-1 + 0.10.0 — 뷰포트 변환 (width/height 일반화)
  play.ts                                  # P3b 완료 — PlayState / applyMove / isWin (순수 결정론)
  render/
    types.ts                               # P2.1 완료 + P3b renderPlayer — RenderEngine 인터페이스
    icons.ts                               # P2.1 완료 — lucide v1.14.0 iconNode 임베드 (User/Flag, ISC)
    default.ts                             # P2.1 완료 + P3b playerTint/Icon + renderPlayer 구현
    index.ts                               # P2.1 완료 — selectEngine 진입점 (V2 sprite-dungeon 분기 자리)
  share.ts                                 # P4 — short_id 생성 · payload 직렬화
components/maze/
  step-nav.tsx                             # P2 완료 + P3b 3-step 확장 (Step = 1|2|3 + disabledSteps)
  settings-panel.tsx                       # P2 완료 — Step1 설정 (크기·fog)
  tool-palette.tsx                         # P2 + 0.6.1 — Step2 도구 팔레트 (지우개 제거 + MAZE_TOOL_ICONS 정합)
  maze-grid.tsx                            # P2 완료 + P2.1 재배선 — engine 오케스트레이션 only (fillRect 직접 호출 0)
  reset-confirm-dialog.tsx                 # P2 완료 — 맵 초기화 확인 모달
  validation-panel.tsx                     # P3a + P3a-2 — Step2 배지: 미통과 사유 / 통과 시 별점·차원 바·약점
  editor-controls.tsx                      # P3c-1 — Step2 undo/redo/초기화 컨트롤 row
  path-commit-button.tsx                   # P3c-2 — 길 도구 활성 시 노출되는 "벽 생성" 버튼
  zoom-controls.tsx                        # P3e-1 — 캔버스 우상단 줌·손도구 오버레이
  play-canvas.tsx                          # P3b 완료 — Step3 캔버스 (fog 시야 안 셀+격자선만)
  play-controls.tsx                        # P3b 완료 — D-pad + 키보드(방향키 preventDefault)
  play-mode.tsx                            # P3b 완료 — Step3 컨테이너 (P4 재사용 인터페이스)
  win-dialog.tsx                           # P3b 완료 — 승리 모달
app/api/maze/
  route.ts                                 # P4 — 공유 저장/조회 (runtime="edge" 금지)
```

> `lib/`·`components/`는 루트 하위 (`lib/language-maker/`·`lib/supp-plan/` 패턴과 일관).

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
