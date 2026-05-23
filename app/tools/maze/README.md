# 픽셀 미로 만들기 — `/tools/maze`

> UI 표시명은 "픽셀 미로 만들기" (en "Pixel Maze Maker"). 코드 식별자(slug `maze`, registry id, `TileType`/`MazeProject` 타입, 파일 경로)는 불변.

픽셀 격자 위에 미로를 설계하고, 시야 제한(Fog of War)으로 플레이하며, 숏링크로 공유하는 도구.

## 목적

게임 세계관 제작자·퍼즐 디자이너·창작자가 정해진 미로가 아니라 자기만의 미로를 0부터 설계하고, 시야 제한 플레이로 검증한 뒤 짧은 링크로 공유할 수 있도록 한다. 픽셀 단위로 벽·길·시작점·도착점을 찍고, 16·32·64 정사각 격자 중 선택하는 흐름.

출처: 외부 기획서 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## 화면 구조 (V1 — 3-step)

언어 창조기의 step-by-step UX 패턴 재사용 (도구 간 일관성).

### Step 1 — 설정
- 맵 크기 16/32/64 정사각 선택 + Fog of War 토글 + 시야 반경(1~6) 입력.
- **사이즈 잠금** — 그리기 시작 시 사이즈가 고정된다. Step2에서는 변경 불가.

### Step 2 — 그리기
- 도구 4종(벽 / 지우개 / 시작점 / 도착점)을 골라 격자를 클릭·드래그로 칠한다.
- 시작점은 1개(새로 찍으면 이동), 도착점은 여러 개 배치 가능.
- **완결성 검증 패널** — 도구 팔레트 아래에 라이브 배지. 통과 시 "플레이 가능", 실패 시 critical 사유 + 펼침 시 규칙별 상태. 검증 모듈은 `lib/maze/validate.ts` 순수 함수 + `useMemo(grid)` 라이브 재계산.
- Step2 → Step1 되돌아가기 시 "맵 초기화" 확인 다이얼로그 → 맵 전면 리셋 (Padding/Crop 없음).

### Step 3 — 플레이
- 검증 통과 시에만 활성화 (StepNav `disabledSteps`).
- 시작점에서 출발, 4방향 이동. 키보드(방향키 / WASD) + 화면 D-pad(데스크탑·모바일 공통).
- 이동 규약: `r,c`를 `[0, size-1]` clamp + WALL 진입 차단 + EMPTY/START/GOAL 통과. **BFS(검증)와 동일한 `isPassable` 단일 헬퍼 호출** — 통과성 정의 공유.
- 도착점 도달 시 승리 모달 → 다시 플레이 / 편집으로 돌아가기.
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
  validate.ts                              # P3a 완료 — 완결성 검증 (BFS·엔드포인트). 규칙2 = clamp 자동 충족
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
  tool-palette.tsx                         # P2 완료 — Step2 도구 팔레트
  maze-grid.tsx                            # P2 완료 + P2.1 재배선 — engine 오케스트레이션 only (fillRect 직접 호출 0)
  reset-confirm-dialog.tsx                 # P2 완료 — 맵 초기화 확인 모달
  validation-panel.tsx                     # P3a 완료 — Step2 검증 배지 + 펼침 상세
  play-canvas.tsx                          # P3b 완료 — Step3 캔버스 (fog 시야 안 셀+격자선만)
  play-controls.tsx                        # P3b 완료 — D-pad + 키보드(방향키 preventDefault)
  play-mode.tsx                            # P3b 완료 — Step3 컨테이너 (P4 재사용 인터페이스)
  win-dialog.tsx                           # P3b 완료 — 승리 모달
app/api/maze/
  route.ts                                 # P4 — 공유 저장/조회 (runtime="edge" 금지)
```

> `lib/`·`components/`는 루트 하위 (`lib/language-maker/`·`lib/supp-plan/` 패턴과 일관).

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
