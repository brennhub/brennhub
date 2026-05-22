# 픽셀 미로 만들기 — `/tools/maze`

> UI 표시명은 "픽셀 미로 만들기" (en "Pixel Maze Maker"). 코드 식별자(slug `maze`, registry id, `TileType`/`MazeProject` 타입, 파일 경로)는 불변.

픽셀 격자 위에 미로를 설계하고, 시야 제한(Fog of War)으로 플레이하며, 숏링크로 공유하는 도구.

## 목적

게임 세계관 제작자·퍼즐 디자이너·창작자가 정해진 미로가 아니라 자기만의 미로를 0부터 설계하고, 시야 제한 플레이로 검증한 뒤 짧은 링크로 공유할 수 있도록 한다. 픽셀 단위로 벽·길·시작점·도착점을 찍고, 16·32·64 정사각 격자 중 선택하는 흐름.

출처: 외부 기획서 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

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

아래 타입이 **canonical** — P2 에디터·storage·share 레이어가 이 정의를 상속한다.

```typescript
// lib/maze/types.ts (P2 예정 — 본 README가 canonical 출처)
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
  schemaVersion: number;   // localStorage 마이그레이션용
  size: MazeSize;          // 정사각 한 변 칸 수 (16 | 32 | 64)
  tiles: TileType[][];     // [size][size] 정수 격자
  fogOfWar: boolean;       // 시야 제한 모드 (MVP 기능 3)
  fogRadius: number;       // fogOfWar=true일 때 가시 반경 (칸)
  theme: MazeTheme;        // V1 = "default" 고정
};
```

> **타일 정수 저장 결정** — 숏링크는 payload가 작을수록 유리하다. 64×64 = 4096칸을 `"wall"`/`"empty"` 같은 문자열로 직렬화하면 정수 대비 약 4배. 저장 포맷을 정수로 고정하고, 매핑 레이어(`"wall" ↔ 1`)는 두지 않는다 — 저장값이 곧 정수, 가독성은 `TILE` 명명 상수로만 확보.

> **Fog of War는 canonical 타입에 포함** — 기획서상 MVP 기능(기능 3)이므로 `fogOfWar`/`fogRadius`를 처음부터 `MazeProject`에 둔다. P2에서 필드 추가로 인한 schema 마이그레이션을 피하기 위함.

## 공유 저장 (D1)

`migrations/001_maze.sql` — `maze` 테이블:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `short_id` | `TEXT PRIMARY KEY` | 6자 숏링크 ID (`CHECK length = 6`) |
| `payload` | `TEXT NOT NULL` | `JSON.stringify(MazeProject)` |
| `created_at` | `INTEGER NOT NULL` | epoch ms |

binding 명은 `MAZE_DB` (예정). **P1(스캐폴딩) 범위에서는 마이그레이션 SQL 파일만 생성** — D1 데이터베이스 생성, `wrangler.jsonc` binding 배선, 마이그레이션 적용은 공유 API route를 붙이는 P2 task로 이연한다. (`wrangler.jsonc` 확인 결과: `d1_databases` 블록은 top-level + `env.preview` 양쪽에 존재 — 신규 binding 추가 시 양쪽 모두에 명시 필요.)

## 차별점 · 확장 계획

- **차별점** — 정해진 미로 풀이가 아니라 픽셀 단위 직접 설계 + 시야 제한 플레이 + 숏링크 공유. 게임 세계관·퍼즐 제작 용도.
- **V2 후보** — Trap/Key/Door 타일, 테마 시스템(`sprite-dungeon`), 공유 API rate limit, 인기 미로 랭킹. 상세 [BACKLOG.md](./BACKLOG.md).

## 파일 구조

```
app/tools/maze/
  README.md / BACKLOG.md / CHANGELOG.md   # P1 완료
  migrations/001_maze.sql                  # P1 완료 — D1 공유 테이블
  page.tsx                                 # P2 — Server Component shell
  client-shell.tsx                         # P2 — 상태·도구 오케스트레이션
lib/maze/
  types.ts                                 # P2 — TileType / MazeProject + 상수 (위 canonical)
  storage.ts                               # P2 — localStorage load/save/migrate
  share.ts                                 # P2 — short_id 생성 · payload 직렬화
components/maze/
  maze-grid.tsx                            # P2 — 픽셀 격자 에디터 (canvas)
  tile-palette.tsx                         # P2 — 타일 선택 팔레트
  size-selector.tsx                        # P2 — 16/32/64 선택
app/api/maze/
  route.ts                                 # P2 — 공유 저장/조회 (runtime="edge" 금지)
```

> `lib/`·`components/`는 루트 하위 (`lib/language-maker/`·`lib/supp-plan/` 패턴과 일관).

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
