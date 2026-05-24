# 픽셀 미로 만들기 Changelog

주요 결정 / 이정표.

## [1.1.0] — 2026-05-24

### Added (P5a — 제한 시간 데이터 모델 + 만들기 UI)

플레이 카운트다운·게임오버·결과 화면·사운드는 **P5b 별도 task**. P5a는 필드 + 마이그레이션 + 만들기 설정까지. **dev only 배포** — main 머지는 P5b 완료 후.

- **`MazeProject.timeLimitSec: number | null`** 추가. null = 타이머 없음. 양수면 `[TIME_LIMIT.MIN, TIME_LIMIT.MAX]` 초.
- **`SCHEMA_VERSION 3 → 4`** + **v3→v4 마이그레이션**. 기존 미로는 `timeLimitSec=null` (타이머 없음) 자동 부여 — 옛 localStorage 드래프트·D1 공유 payload 모두 깨지지 않음.
- **`TIME_LIMIT = { MIN: 10, MAX: 900, DEFAULT: 60 }` 상수** (`lib/maze/types.ts`):
  - MIN 10s: 시작·도착 클릭만으론 부족하지 않은 최소
  - MAX 900s (15분): 큰 미로(128×128)도 충분
  - DEFAULT 60s: toggle ON 시 32×32 정통 미로 기준
- **storage.ts migrate 재구조**:
  - `migrateOrNull` v3→v4 분기 추가 (`timeLimitSec: null` 강제)
  - v4 검증에 `timeLimitSec` 가드 (null 또는 정수 [MIN, MAX], 손상값 null fallback)
  - **share.ts 무수정** — `parseSharedPayload`·`isValidPayload`가 둘 다 `migrateSharedPayload` 경유, 그 함수가 `migrateOrNull` 공유 → 자동 호환 (잔손질 1 검증 완료).
- **만들기 UI — 시간 제한 카드 (`settings-panel.tsx`)**:
  - 위치: Fog of War 카드 아래 별도 카드. 의미 분리(fog=시각, 시간=시간 제약) 명확
  - Switch + NumberStepper (smallStep=10, bigStep=60)
  - toggle off → stepper 미렌더 / toggle on → DEFAULT 또는 직전 값
  - **toggle on/off 시 값 캐시** (`lastTimeLimitRef`): off→on 시 사용자가 직전에 설정한 값 복원
- **`client-shell.handleTimeLimitChange(n: number | null)`** — 즉시 setProject (grid 영향 0).
- **`grid.ts newProject` default = `timeLimitSec: null`**.
- **i18n 5키 ko/en** — timeLimitLabel·timeLimitDescription·timeLimitValueLabel·timeLimitMaxReached·timeLimitMinReached. ko/en 정보량 통일(둘 다 "시간 초과 시 게임 오버" 취지 포함, 잔손질 2).

### Decided

- **Q1: `timeLimitSec: number | null`** — boolean+number 두 필드 동기화 부담·0 sentinel 의미 충돌 회피. 단일 필드 명확.
- **Q2: 초 단위, 10~900s, DEFAULT 60s** — 작은 미로 의미 보장 + 큰 미로 풀 시간 충분.
- **Q3: settings-panel 안 별도 카드** — fog와 의미 분리. toggle on/off 시 값 캐시.
- **Q4: v3→v4 마이그레이션 자동, share.ts 무수정** — migrateOrNull 단일 경로 검증 완료.
- **Q5: dev only 배포** — P5b 완료 후 main 머지로 완성 기능 prod 진입. 사용자가 미완성 상태 경험 차단.
- **registry·share·page·api 무변경** — 데이터 모델 + 만들기 UI만.

### Notes

- play.ts·play-mode·play-canvas·win-dialog·sound — 무변경. **플레이에서 timeLimitSec 무시** (P5b 영역).
- 점수 산식·SCORE_TUNING·commit·validate·pathMarks·viewport·카메라 — 무변경.
- 기존 v3 미로(localStorage + D1 공유)는 v4 migrate 후 `timeLimitSec: null`로 정상 작동.

## [1.0.0] — 2026-05-24

### Released (P4b — 정식 런칭)

P1 스캐폴딩부터 P4a 숏링크까지 합쳐 maze 도구를 정식 출시. tools-registry status `coming-soon` → `live`. dev 검증 완료 후 사용자가 feat/maze → main 머지로 brennhub.com 배포.

### Changed

- **STAR_THRESHOLDS 보정** — `[0.2, 0.4, 0.72, 0.85]` → `[0.2, 0.49, 0.71, 0.88]`. dev에서 6종 아키타입 미로(빈 들판 · 살짝 굽은 길 · 적당한 미로 · 구불구불 외길 · 정통 분기 미로 · 크고 복잡한 미로) 실측 후 확정. P3a-2 1차안의 fragile 임계값(0.72) 보정 — 외길(★3)과 정통 미로(★4) 분리됨.
- `lib/maze/validate.ts` SCORE_TUNING 헤더 주석 "fragile 1차안" → "6종 아키타입 미로로 보정 완료" 갱신.
- **tools-registry maze status** — `"coming-soon"` → `"live"`. 메인 카탈로그 카드 활성화. `hasPage: true` 유지 (P2 결정 — `[slug]` fallback 충돌 방지).

### Removed

- **archetype 보정용 콘솔 로그** — `client-shell.tsx`의 `console.log("[maze score]", ...)` useEffect 통째 제거 (P3a-2 BACKLOG 항목 — boot strap 후 prod 노이즈 방지).

### Notes — 회귀 0

- 점수 산식 / SCORE_TUNING 다른 상수 / commit / validate / pathMarks / play.ts / viewport / 카메라 / 사운드 / D1 / share / 공유 흐름 — 모두 무변경.
- STAR_THRESHOLDS 변경은 튜닝 값만 — 새 임계값 매핑: `total<0.20 → ★1, <0.49 → ★2, <0.71 → ★3, <0.88 → ★4, ≥0.88 → ★5`.

### Milestone

P1(스캐폴딩) · P2(에디터) · P3a(검증) · P3a-2(점수) · P3b(플레이·fog) · P3c-1(undo/redo·재클릭) · P3c-2(길·벽 생성) · P3d(단계 통합) · P3e-1(편집 줌·viewport) · P3f(직사각 일반화) · P3e-2(플레이 카메라) · 사운드 · P4a(숏링크) · P4b(보정·라이브) 완성. 다음은 main 머지 → brennhub.com 정식 배포 (사용자 수동).

## [0.14.0] — 2026-05-23

### Added (P4a — 숏링크 공유 + ?id= 진입)

D1 + 6자 숏링크. **registry 여전히 coming-soon** — 라이브 전환은 P4b (archetype 보정 + main 머지).

- **`lib/maze/share.ts` (신규)** — `generateShortId` (6자 알파넘, Web Crypto), `isValidShortId`, `parseSharedPayload` (JSON.parse + `migrateSharedPayload`), `isValidPayload`.
- **`app/api/maze/route.ts` (신규)** — POST `/api/maze`. D1 binding `MAZE_DB`. 충돌 시 1회 retry. IP SHA-256 해시 기반 30s rate limit (feedback 패턴). `runtime="edge"` 명시 안 함. payload 1MB 상한.
- **`migrations/001_maze.sql` 갱신** — `ip_hash TEXT` 컬럼 + 인덱스 `idx_maze_ip_hash(ip_hash, created_at DESC)` — rate limit 쿼리용.
- **`storage.ts` migrate 재구조 (잔손질 1 반영)** — `migrateOrNull` (internal, 폐기 null) + `migrate` (loadProject용 newProject fallback) + **`migrateSharedPayload` (export, 공유용, grid empty도 null)**. 숏링크 = 영구 스냅샷이라 sharedProject도 localStorage 드래프트와 같은 migrate 경로 → 향후 schema bump 시 구 숏링크 안 깨짐. v1→v2→v3 두 단계 이미 거쳤기에 필수.
- **`app/tools/maze/page.tsx`** — Server Component. `searchParams.id` → `isValidShortId` 가드 → `getCloudflareContext().env.MAZE_DB` D1 fetch → `parseSharedPayload` (try/catch 손상 row 방어) → `sharedProject` prop. ?id 없으면 기존 만들기.
- **`components/maze/shared-not-found.tsx` (신규)** — server-rendered fallback. 손상·만료·잘못된 id 한 화면 + "내 미로 만들기" 링크.
- **`client-shell.tsx` shared 모드**:
  - `sharedProject` 있으면: localStorage hydrate skip · persist skip · `step=2` 강제 · StepNav 숨김 · WinDialog "내 미로 만들기" 라벨로 `/tools/maze` navigate (id 제거).
  - 없으면 기존 흐름.
  - V1 = read-only play. 리믹스/복사 편집은 V2 BACKLOG.
- **`components/maze/share-controls.tsx` (신규)** — 만들기 단계 ValidationPanel 아래. `validation.ok` 시만 노출. POST → 6자 id → URL + 복사 버튼. loading/error/ready 상태. rate limit 별도 메시지.
- **`PlayMode`·`WinDialog` `backLabel` props** — shared 모드에 "내 미로 만들기"로 override + 동작 `router.push("/tools/maze")`.
- **`wrangler.jsonc`** — `MAZE_DB` binding (prod `brennhub-maze` + env.preview `brennhub-maze-dev`). database_id placeholder — **사용자 핸드오프**.
- **i18n 10키** (ko/en) — share*·sharedBuildOwn.

### Decided

- **D1 스키마 = JSON 블롭** — schemaVersion 자체가 payload 안. 향후 maze schema bump가 D1 변경 0.
- **migrate 3분기 구조** — 호출자가 폐기 fallback 결정 (newProject vs not-found).
- **V1 = read-only play** — 사용자 명시. 리믹스 V2.
- **공유 = 스냅샷 불변** — id당 payload 영구.
- **registry coming-soon 유지** — P4a는 dev 검증. 라이브 전환 P4b.
- **share-controls 위치 = ValidationPanel 아래** — PathCommitButton 패턴 일관.

### Notes — D1 생성 핸드오프

```bash
# 1. 데이터베이스 생성 (Cloudflare 계정 권한 필요 — 사용자 실행)
wrangler d1 create brennhub-maze       # 출력의 database_id = <PROD_UUID>
wrangler d1 create brennhub-maze-dev   # 출력의 database_id = <DEV_UUID>

# 2. wrangler.jsonc 양쪽 placeholder 교체:
#    top-level "REPLACE_WITH_PROD_MAZE_DB_ID" → <PROD_UUID>
#    env.preview "REPLACE_WITH_DEV_MAZE_DB_ID" → <DEV_UUID>

# 3. 마이그레이션 적용 (prod + preview 양쪽)
wrangler d1 execute brennhub-maze --remote --file=app/tools/maze/migrations/001_maze.sql
wrangler d1 execute brennhub-maze-dev --remote --env=preview --file=app/tools/maze/migrations/001_maze.sql

# 4. feat/maze → dev 머지 + push → dev.brennhub.com 자동 배포로 검증
```

placeholder 그대로면 API가 500(`DB_UNAVAILABLE`) 반환 — 명확한 실패 시그널.

### Notes — 회귀 0

- 점수 / SCORE_TUNING / commit / validate / pathMarks / play.ts / viewport / 카메라 / 사운드 — 무변경.
- `/tools/maze` route emit 형식: 정적(`○`) → 동적(`ƒ`) (searchParams 사용). 정상.
- `loadProject` 무변경 — `migrate` wrap이 기존 newProject fallback 유지.

## [0.13.0] — 2026-05-23

### Added (플레이 사운드 — 합성)

플레이 모드 3개 효과음 (이동·벽·승리) + 음소거 토글. **Web Audio API 합성**, 음원 파일 0 — 라이선스·번들·CDN 모두 무. brennhub "small, sharp, opinionated" + 단일 스택 정신 일관. 배경음은 BACKLOG.

- **`lib/maze/sound.ts` (신규)** — `SoundController` singleton. AudioContext lazy 생성·idempotent resume·in-module 상태. API: `playMove` / `playBlocked(dir)` / `playWin` / `setMuted` / `isMuted` / `init`.
- **합성 캐릭터**:
  - **move**: sine 440Hz, 40ms, gain 0.07 — 매우 짧고 subtle
  - **blocked**: triangle 200Hz, 100ms, gain 0.10 — 살짝 길고 낮은 thud
  - **win**: C5/E5/G5 분산 (C major), 각 150ms × 3음, 100ms 간격, gain 0.16 — 짧은 모티프 1회
  - 모두 5ms attack + linear decay envelope으로 click 차단
- **연속 발화 억제 (잔손질 1 반영)**:
  - **move 50ms 스로틀** — `lastMoveAt: number`. 키 오토리핏으로 사운드 쌓이지 않게
  - **blocked 같은 방향 1회** — `lastBlockedDir: Dir | null`. 방향키를 벽 쪽으로 누르고 있어도 첫 부딪힘만 발화 (thud 드론 차단). 성공 이동·다른 방향 차단 시 리셋
- **`play.ts` 무변경 — 순수 결정론 유지**. 사운드는 `play-mode` 컴포넌트가 `applyMove` 결과 비교로 트리거. blocked 감지 = `next === prev` (same object reference, P3b 결정 + 0.10.0 Phase A 후에도 `play.ts` L58/64/66 `return state` 유지 확인됨, 잔손질 2)
- **음소거 토글**:
  - 기본 ON(사운드 켜짐) — 새 사용자가 기능 발견. 끄는 수단(우상단 Volume 아이콘)이 눈에 잘 띔
  - `localStorage` 키 `brennhub-maze-sound-muted` — **사용자 전역 설정**. `MazeProject` 무관, **schemaVersion 영향 0**, 공유 미로(P4)에 따라가지 않음
  - UI: `PlayControls` 안내 텍스트 행 우측에 `Volume2`/`VolumeX` 아이콘 토글
- **autoplay 정책 우회**: `PlayMode` mount `useEffect`에서 `sound.init()` — StepNav "플레이" 클릭(user gesture) 후속. 매 사운드 호출이 `init()` 재호출 (idempotent resume) — iOS Safari 등 edge용 폴백
- **i18n 신규 2키** (ko/en) — `soundMute` / `soundUnmute`

### Decided

- **합성음 채택** — 음원 파일은 라이선스·번들·CDN·R2 추가 → 단일 스택 정신 위반. BRENNHUB.md 광고·외부 인프라 금기와 정신 일관. 짧은 효과음 3개는 OscillatorNode + envelope으로 충분.
- **배경음은 BACKLOG** — "가능하면" 명시. 어설픈 합성 앰비언트보다 없는 게 나음. dev 점검 후 사용자 판단.
- **음소거 default ON** — 새 사용자 기능 발견. 토글이 눈에 잘 띄어 즉시 끄기 가능.
- **사운드 = 사용자 전역 설정, project 무관** — schemaVersion 영향 0. P4 숏링크 공유 시 수신자 본인 muted 설정 적용 (공유자 설정 무관).
- **`play.ts` 순수 유지** — `applyMove`는 새 state 반환만, 사운드 호출 X. 호출자(play-mode)가 결과 비교로 이벤트 추론.
- **blocked 억제 = 같은 방향 1회** (사용자 잔손질 1) — 시간 스로틀만으론 thud(100ms) 이상 간격이라도 오토리핏 시 겹침. 방향별 발화 추적이 자연 (성공 이동 또는 방향 전환 시 재발화).
- **applyMove same-object 반환 확인** (사용자 잔손질 2) — `play.ts` L58/64/66 모두 `return state` 보장. P3b 결정 후 직사각 리팩터에도 유지. blocked 감지 정상.

### Notes

- 점수 / SCORE_TUNING / commit / validate / pathMarks / `play.ts` 이동·승리 / viewport.ts / 카메라 / Phase B UI — 무변경.
- API route 미생성. AI 미사용 — 합성 = 결정론 파라미터.

## [0.12.0] — 2026-05-23

### Added (P3e-2 — 플레이 카메라 + 제작자 설정 시야 거리)

큰 맵 플레이를 위한 카메라 추적. 시야 거리는 제작자가 만들기 단계에서 설정 (16칸 가장 가까이 ~ max(W,H) 전체 fit). 원 P3e plan의 "16칸 고정"을 사용자 요구대로 가변 필드로 개정.

- **`MazeProject.playViewSpan: number`** — 캔버스 한 변에 보이는 칸 수. 범위 `[ZOOM_REFERENCE_SIZE(=16), max(width, height)]`. 작을수록 가까이(셀 크게), 클수록 멀리(셀 작게).
- **schemaVersion 2 → 3** — `storage.ts` migrate에 v2→v3 분기. 구 프로젝트는 `playViewSpan = 16` 강제 (사용자 명시: "구 프로젝트 기본 = 가장 가까이"). migrate 재귀 호출로 v3 분기 자동 처리. storage가 손상값·stale 값에 대비해 `[16, max(W,H)]` clamp.
- **`play-canvas.tsx` 카메라 적용** — `viewport.ts cameraFollow` (Phase A에서 width/height 일반화 완료) 그대로 호출. cellPx = displayPx / effectiveN, effectiveN = clamp(playViewSpan, 16, max(W,H)). `clampPan`이 자동으로 카메라 정지(grid ≤ displayPx)·추적(grid > displayPx) 분기 처리. 별도 분기 코드 0.
- **`play-canvas.tsx` 가시 셀 컬링** — Phase B에서 P3e-2로 미뤘던 항목. `[rMin,rMax)×[cMin,cMax)` 범위. maze-grid Phase B 패턴 그대로. 128×128 N=16에서 16384 → 256 셀 (64배 절약). fog ON 시 clip 외에 컬링이 fillRect 호출 수 추가 절약.
- **fog 원형 clip 변환 보정** — `ctx.arc(panX + (player.c+0.5)*cell, ...)` — 카메라 변환 후 좌표계에서 player 중심.
- **플레이어 셀 마커 skip (0.10.1)** 유지 — 컬링 범위 안이라도 `if (r === player.r && c === player.c) continue`.
- **`settings-panel.tsx` 플레이 시야 거리 row** — fog 카드 안 별도 row. `NumberStepper` (min=16, max=max(W,H)). `max(W,H) ≤ ZOOM_REFERENCE_SIZE`이면 row 자체 미렌더(zoom-controls 비활성 패턴 일관). 즉시 적용(다이얼로그 없음 — grid 영향 0).
- **`client-shell.tsx`**:
  - `handlePlayViewSpanChange` 콜백 — clamp 후 즉시 setProject.
  - `applySizeChange`에 `playViewSpan: clampPlayViewSpan(p.playViewSpan, width, height)` 추가 — **사이즈 변경 시 stale 저장값 일관 정렬**. 사용자 정정 반영: 운영 시점만 clamp는 NumberStepper max와 저장값 어긋남 발생.
- **i18n 신규 3키** (ko/en) — `playViewSpanLabel` / `playViewSpanMax` / `playViewSpanMin`.

### Decided

- **데이터 모델 = "보이는 칸 수 N" (옵션 C)** — cellPx 직접(display 결합)·정규화 0..1(직관 X) 대비 의미 직관적 + display 비결합 + 정수 단위 스테퍼 자연.
- **단일 출처 `ZOOM_REFERENCE_SIZE = 16`** — viewport.ts에서 export, storage·grid·settings-panel·play-canvas·client-shell이 모두 import. 편집 줌인 한계(셀 크기)와 플레이 시야 최소 거리(칸 수)가 같은 16칸 단위라 의미 일관.
- **사이즈 변경 시 playViewSpan clamp** — 사용자 정정 반영. "저장값 보존, 운영 시점에만 clamp"는 스테퍼 max(=max(W,H))와 저장값 어긋남 발생 (예: 64→32 축소 후 50이 max=32 초과 잔류). 저장값을 새 범위로 정렬해 항상 스테퍼 안. 축소→확대 N 복원 nicety는 포기 — 일관성이 더 중요.
- **카메라 = `cameraFollow + clampPan` 자동 분기** — cellPx ≤ fit이면 양 차원 ≤ displayPx로 가운데 정렬(정지), cellPx > fit이면 한 차원 클램프(추적). 별도 분기 코드 불필요.
- **fog clip + 카메라 합성** — clip center 좌표가 변환된 픽셀(panX/Y + ...). 자연 작동.
- **"다시 플레이" 카메라 리셋** — `setState(initialPlayState(grid))` → player 좌표 → cameraFollow 자동 재계산. 별도 카메라 리셋 코드 0.
- **P4 숏링크 자동 직렬화** — `playViewSpan` 필드가 `MazeProject` 안이라 JSON.stringify에 자연 포함. 공유 미로가 제작자 줌 그대로 플레이.
- **viewport.ts 무변경** — Phase A에서 이미 width/height 일반화. P3e-2는 호출자(play-canvas)만 신규.

### Notes

- 점수 산식 / `SCORE_TUNING` / commit / pathMarks / play.ts 이동·승리 / viewport.ts 산술 — **무변경**. 렌더·새 필드·새 핸들러만.
- maze-grid (편집 캔버스) / 편집 줌 (P3e-1) / Phase B W·H UI·컬링 — **무변경**.
- 16×16 / 16×8 / 8×16 등 max(W,H) ≤ 16 케이스: settings-panel 시야 거리 row 미렌더 + play-canvas effectiveN = max(W,H) clamp로 fit·정지. 현행 동일.

## [0.11.0] — 2026-05-23

### Added (Phase B — 임의 W·H UI + 가시 셀 컬링)

0.10.0 Phase A 내부 일반화 위에 비정사각 그리드 UI 노출. 캔버스 변환은 Phase A에서 이미 양 차원 지원 — Phase B는 사용자 진입점(스테퍼·프리셋) + 컬링.

- **`settings-panel.tsx` W·H NumberStepper** — `widthLabel`/`heightLabel` 각각 `DIM_MIN(3)..DIM_MAX(128)` `NumberStepper` (fogRadius 패턴 재사용). 정사각 프리셋 quick-pick `[16×16][32×32][64×64]` 별도 row 유지.
- **스테퍼 ↔ 다이얼로그 충돌 해소** — 스테퍼는 `localW`/`localH` **local pending state**로만 편집(부모 grid 무영향). **명시 [적용] 버튼**이 변경 확정 — `hasPendingChange` 조건일 때만 활성. 버튼 클릭 → `onSizeChange(localW, localH)` 1회 호출 → client-shell이 빈/비어있지 않음 판정. 스테퍼 +/− 단발마다 다이얼로그 뜨는 것 차단(사용자 명시 요구).
- **외부 변경 동기화** — props `width`/`height` 변경 시 `useEffect`로 local 동기화. 프리셋 quick-pick은 직접 `onSizeChange(s, s)` 즉시 호출 → 부모 갱신 → local도 따라옴.
- **가시 셀 컬링 (`maze-grid.tsx`)** — `view.panX/panY/cellPx` 기준 `[rMin,rMax)×[cMin,cMax)` 가시 범위 계산. renderTile/renderPathMark 루프 모두 컬링 적용. 128×128 줌인 시 16384 → 수백 셀로 절약. 줌아웃 fit 시 컬링 영역 = grid 전체라 효과 0(자연 fallback).
- **i18n 신규 7키** (ko/en): `widthLabel`/`heightLabel`/`applySize`/`presetsLabel`/`dimMaxReached`/`dimMinReached` + (`sizeLabel` 유지).

### Changed

- `client-shell.tsx` `handleSizeChange` → `handleDimsChange` 이름 변경 (의미 명확화 — 단일 size 아닌 두 차원 변경).
- 비정사각 캔버스 — Phase A `viewport.ts` `clampPan`이 이미 양 차원 가운데 정렬 처리. Phase B에서 처음 실제 비정사각 W·H가 들어오니 50×150·128×4·3×128 케이스 시각 검증 필요(레터박스 = 캔버스 배경색).

### Decided

- **명시 적용 버튼 (옵션 A)** — blur 자동 적용(B)·디바운스(C)·Enter(D) 대비 의도 가장 명확. 사용자가 W·H 조정 의도가 확실할 때만 다이얼로그.
- **스테퍼는 local pending state** — 부모 project.width/height와 분리. 외부 변경(프리셋·undo) 시 useEffect로 동기화. 단일 출처는 부모, local은 임시 편집 버퍼.
- **프리셋 클릭은 즉시 적용** (Phase A 흐름 유지) — 한 클릭이 한 변경이라 다이얼로그 1회 흐름과 일관.
- **가시 셀 컬링은 maze-grid만** — play-canvas는 플레이 카메라(P3e-2)가 있어야 viewport 밖 셀이 의미. 카메라와 함께 P3e-2에서 적용.

### Notes

- 점수 산식 / `SCORE_TUNING` / commit / pathMarks / play.ts 이동·승리 / `viewport.ts` 산술 모듈 — 무변경.
- 데이터모델 · schemaVersion — 무변경 (Phase A로 끝).
- 16/32/64 정사각 회귀 0 — 프리셋 quick-pick이 (s, s) 호출, 기존 흐름 유지.
- 비정사각 archetype(예 32×64 정통 미로)으로 점수 콘솔 로그 측정은 dev 점검 시 가이드.

## [0.10.1] — 2026-05-23

### Changed (UI 정리 3건)

- **줌 컨트롤 캔버스 밖으로** — 캔버스 우상단 absolute 오버레이가 셀 그리기를 가리던 문제 해소. flex row 안에서 캔버스와 나란히 우측 외부 배치. 모바일 좁은 폭에선 flex-wrap으로 아래로 떨어짐. ZoomControls 내부의 `absolute top-2 right-2` 제거, `bg-card/90 backdrop-blur` → `bg-card` 단순화.
- **줌 불가 맵에선 컨트롤 자체 미렌더** — `Math.max(width, height) <= ZOOM_REFERENCE_SIZE` 조건. 기존엔 disabled 버튼만 보였는데 위젯 자체 숨김으로 시각 정리. client-shell에서 `viewport.ts` `ZOOM_REFERENCE_SIZE` import 후 조건부 렌더.
- **fog 토글 같은 row** — `fogOfWar` ON 시 시야 반경 컨트롤이 아래 별도 row로 떨어져 세로 레이아웃이 밀리던 문제 해소. settings-panel에서 토글 오른쪽 같은 row 안에 가로 배치(`flex-wrap items-center`). fog ON 시 row 폭만 늘어나고 세로 무변.
- **플레이어 점유 셀 타일 마커 skip** — `play-canvas.tsx` renderTile 루프에서 `(r === player.r && c === player.c)` 셀은 skip. 시작점 발자국이 플레이어 아래로 비치던 겹침 해소. 플레이어가 떠난 셀은 다시 마커 보임. 0.7.1의 "시작 자국 보존" 메타포는 떠나는 사람의 *흔적*에 한정 — 같은 칸에선 사람만 표시.

### Notes

- 점수·commit·validate·play.ts·viewport 로직 무변경 (동작은 시각만).
- 데이터모델·schemaVersion 무변경 (0.10.0 Phase A 위 패치).

## [0.10.0] — 2026-05-23

### Changed (Phase A — 직사각 그리드 내부 데이터모델 일반화)

`MazeProject.size: 16|32|64` → `width`/`height: number` 분리. **동작 무변화** — UI는 정사각 프리셋 버튼 유지(`(s) => onSizeChange(s, s)`). 비정사각 UI 도입은 Phase B (0.11.0).

- **`lib/maze/types.ts`** — `schemaVersion: 1 → 2`. `MazeSize` 유니온 타입·`SIZES`·`DEFAULT_SIZE` 제거. 신규: `DIM_MIN=3` / `DIM_MAX=128` / `DEFAULT_WIDTH=32` / `DEFAULT_HEIGHT=32` / `SIZE_PRESETS = [16,32,64]` (Phase A 프리셋 호환). `MazeProject`에 `width`/`height` 필드. 인덱싱 모델: `grid[height][width]` 헤더 주석 명시.
- **`lib/maze/storage.ts` migrate v1 → v2** — `const { size, ...rest } = raw` 명시 destructure로 stale `size` 필드 제거(스프레드만 쓰면 raw의 추론 프로퍼티가 통과돼 v2 객체에 잔류, 사용자 정정 반영). v1 데이터의 grid는 size×size = width×height라 데이터 변환 0 — 메타데이터만. `isValidDim` 가드(`DIM_MIN..DIM_MAX` 정수).
- **`lib/maze/grid.ts`** — `emptyGrid(width, height)` / `isValidGrid(value, width, height)`. `newProject`에 `width`/`height` 기본값.
- **`lib/maze/validate.ts`** — `anyGoalReachable`·`bfsDistanceMap` 경계 `r < height && c < width` 분리. `scoreMaze`의 `size = grid.length` → `height = grid.length`. 점수 산식·`SCORE_TUNING` 무변경 — 비율 기반이라 임의 W·H에서도 의미 유지.
- **`lib/maze/play.ts`** — `applyMove` 경계 `nr < height && nc < width` 분리.
- **`lib/maze/viewport.ts`** — `zoomLimits` / `fitView` / `clampPan` / `clampCellPx` / `zoomAtCursor` / `cellFromCanvasPx` / `cameraFollow` 모두 `width`/`height` 두 인자. `zoomLimits.min = min(displayPx/width, displayPx/height)` (양 차원 fit).
- **`render/types.ts` `drawGridLines`** — `(ctx, panX, panY, cellPx, size)` → `(ctx, panX, panY, cellPx, width, height)`. default 엔진 격자선 2-loop을 width(세로선)·height(가로선) 분리.
- **`maze-grid.tsx`** — `size: MazeSize` props → `width, height: number`. 렌더 루프·휠 줌·핀치줌·포인터 역매핑·clamp 모두 width/height. RenderRect의 `size: cellPx` 프로퍼티는 그대로(rect.size = 셀 변 픽셀, 별 의미).
- **`play-canvas.tsx`** — `size` → `width, height`. `cell = min(displayPx/width, displayPx/height)` fit 기준. 정사각이면 둘 다 같아 동작 무변화. P3e-2 카메라 적용은 후속.
- **`play-mode.tsx`** — `<PlayCanvas width height>` 전달.
- **`client-shell.tsx`** — `pendingSize: MazeSize` → `pendingDims: { width, height }`. `applySizeChange(width, height)` / `handleSizeChange(width, height)` / `handleResetGrid` `emptyGrid(p.width, p.height)` / 줌 핸들러·`handleViewChange` 모두 양 차원. `MazeGrid`/`ZoomControls`/`SettingsPanel` props 갱신.
- **`settings-panel.tsx`** — `width, height` props. Phase A UI 무변화: `SIZE_PRESETS` 정사각 버튼이 `onSizeChange(s, s)` 호출. 활성 표시는 `isSquare && width === s`.

### Decided

- **schemaVersion bump = 2** — `size` 필드 의미 폐기, `width`/`height` 도입. v1 → v2는 메타데이터 변환만(grid 데이터 무변경).
- **migrate: `const { size, ...rest } = raw`** — 사용자 정정 반영. `{...raw, schemaVersion:2, width:size, height:size}`는 raw의 추론 프로퍼티 size를 통과시켜 v2 객체에 stale 필드 잔류. destructure로 명시 제거.
- **점수 재보정 불필요** — A(detour)·B(corridor·texture)·total 모두 비율/밀도 기반. 임의 W·H에서도 STAR_THRESHOLDS 의미 유지.
- **인덱싱 모델: `grid[row=height_index][col=width_index]`** — 헤더 주석 명시. row/col 변수명 일관.
- **Phase A 범위 = 내부 일반화만** — UI(settings-panel)는 정사각 프리셋 유지. Phase B에서 W·H NumberStepper UI + 비정사각 캔버스 처리 + 가시 셀 컬링.

### Notes

- 회귀 0: 16/32/64 정사각 그리기·검증·점수·플레이·fog·undo/redo·길 commit·줌·팬 모두 변경 없음.
- v1 → v2 자동 migrate — 기존 사용자 localStorage 드래프트 손실 없이 복원. DevTools에서 `schemaVersion: 2`·`width`·`height` 존재·`size` 없음 확인.
- 점수 알고리즘 / `SCORE_TUNING` / commit 알고리즘 / pathMarks 로직 / play.ts 이동·승리 — 무변경.
- P3e-2 플레이 카메라 — `viewport.ts` `cameraFollow`를 호출하도록 play-canvas 본격 적용은 별도 task. Phase A에선 시그니처 일반화만.

## [0.9.0] — 2026-05-23

### Added (P3e-1 — 편집 줌/팬 + 변환 인프라)

만들기 화면에서 32·64맵 줌/팬. 변환 산술은 순수 모듈로 분리해 P3e-2 플레이 카메라가 같은 함수 재사용.

- **`lib/maze/viewport.ts` (신규)** — 순수 산술 모듈. `ViewState` / `fitView` / `clampPan` / `clampCellPx` / `zoomLimits` / `zoomAtCursor` / `cellFromCanvasPx` / `cameraFollow`. 셀↔픽셀 매핑·pan 클램프·커서 중심 줌·플레이 카메라 follow 모두 한 곳. 컴포넌트(maze-grid·play-canvas)는 이벤트 처리만, 산술은 본 모듈 호출.
- **줌 한계**:
  - 줌아웃 = `displayPx / size` (현 그리드 fit)
  - 줌인 = `displayPx / ZOOM_REFERENCE_SIZE` (16맵 셀 크기)
  - 16맵은 두 한계가 같아 줌 컨트롤 사실상 비활성.
- **`components/maze/zoom-controls.tsx` (신규)** — 캔버스 우상단 absolute 오버레이. 손도구 토글(✋) + 확대(+) + 축소(−) + 맞춤(⊡) 4 버튼. 그리드 위 row를 늘리지 않음 (P3d 모바일 우려 직결). zoomLimits 도달 시 +/− disabled.
- **`maze-grid.tsx` 재배선**:
  - `view: ViewState` / `onViewChange` / `handMode` props 추가.
  - 셀 좌표 = `panX + c × cellPx` / `panY + r × cellPx`. `ctx.scale` 미사용 (lineWidth 일정).
  - **휠 줌** — `useEffect`에서 `addEventListener("wheel", h, {passive: false})`로 직접 등록. React `onWheel` prop은 passive 처리될 수 있어 `preventDefault` 안 먹어 페이지 스크롤 차단 못 함 — gotcha 회피.
  - **멀티터치** — `Map<pointerId, point>` 추적. 1 포인터 = 그리기(또는 손도구 시 팬). **2 포인터 = 핀치줌 + 팬** (anchor 거리·중심으로 zoomAtCursor + 추가 팬).
  - **1→2 포인터 전환 시 stroke finalize** — `drawingRef`/`lastCellRef` 리셋. client-shell의 `strokeFillRef`/`pathStrokeModeRef`는 다음 stroke의 `isInitial=true`가 덮어쓰므로 자동 정리.
  - **스페이스 keydown/keyup** — 일시 손도구. input/textarea focus 시 무시. 스페이스 누르는 순간 진행 stroke도 finalize.
  - `cursor: handMode ? "grab" : "default"` — 시각 피드백.
  - `touchAction: "none"` 유지 — 브라우저 핀치/스크롤이 캔버스 제스처 가로채는 것 차단.
- **`RenderEngine.drawGridLines` 시그니처 확장** — `(ctx, panX, panY, cellPx, size)`. default 엔진 갱신. `play-canvas`는 P3e-1 호환만 (panX=panY=0, cellPx=DISPLAY_PX/size). P3e-2에서 카메라 도입.
- **client-shell `view`/`handMode` state** — transient. `applySizeChange`/`hydrate`에 `setView(fitView(size))` 추가. 버튼 줌은 캔버스 중앙 기준 `zoomAtCursor`. `handleViewChange` 방어적 재clamp.
- **i18n 신규 4키** (ko/en) — `viewZoomIn` / `viewZoomOut` / `viewFit` / `viewHand`.

### Decided

- **순수 산술 모듈 분리** (lib/maze/viewport.ts) — 컴포넌트가 좌표·clamp 산술을 자체 보유하면 P3e-2 play-canvas가 같은 산술을 다시 짜게 됨. 단일 출처로 드리프트 차단. lib/maze/*.ts 패턴(grid·validate·play) 일관.
- **명시 cellPx 변환** (B) — `ctx.scale` 안 씀. lineWidth가 scale 영향 안 받아 격자선·아이콘 stroke 두께 일정. 셀 좌표는 컴포넌트가 계산해 renderTile rect에 그대로 넘김.
- **휠 = addEventListener {passive:false}** — React onWheel passive 처리 문제 회피. 브라우저 gotcha.
- **1↔2 포인터 전환 = stroke 정식 종료** — finalizeStroke 헬퍼로 drawingRef/lastCellRef 리셋. client-shell ref들은 다음 stroke isInitial이 덮어써 자동.
- **줌·팬 = transient** — MazeProject·localStorage 미포함. 새로고침 시 fitView로 복원. schemaVersion 영향 0.
- **사이즈 변경 = view 새 fit** — history·marks와 함께 view도 새 사이즈의 fit으로 리셋.
- **버튼 줌 중심 = 캔버스 중앙**, 휠/핀치 = 커서/중심. 사용자 의도 일치.

### Changed (회귀 없음)

- `play-canvas.tsx` — `drawGridLines` 호출만 새 시그니처(panX=0, panY=0, cell, size). 동작 동일.

### Notes

- 점수 알고리즘 / SCORE_TUNING / validate BFS / commit 알고리즘 / pathMarks 로직 / play.ts(이동·승리) — **무변경** (회귀 0).
- P3e-2 (플레이 카메라) — 본 모듈 재사용 (cameraFollow). 별도 task.
- dev 점검 시 줌 컨트롤 우상단 오버레이가 셀 그리기 가리는지 확인 — 거슬리면 후속 패치(축소·반투명·이동).

## [0.8.0] — 2026-05-23

### Changed (P3d — 설정+그리기 단계 통합)

3-step(설정/그리기/플레이) → **2-step(만들기/플레이)**. "그리기 후 설정으로 돌아갈 때 grid 초기화" 마찰을 제거. 사이즈/fog 컨트롤이 만들기 화면에 상시 노출되어 흐름이 끊기지 않음.

- **StepNav 2노드** — `Step = 1 | 2` (만들기 / 플레이). labels `[string, string]`. `disabledSteps={[2]}` 검증 미통과 시.
- **만들기 화면 통합 레이아웃** — 그리드 **위**(고정 높이만): 헤더 → StepNav → SettingsPanel(사이즈/Fog row) → ToolPalette → EditorControls. 그리드 **아래**(가변/contextual): PathCommitButton → ValidationPanel. 0.5.1·0.7.1의 "가변 요소는 그리드 아래" 원칙 일관 유지.
- **사이즈 변경 흐름** — 비어있지 않은 grid에서 다른 사이즈 클릭 시 `ResetConfirmDialog`(`sizeChange*` i18n) → 확인 시 `{ size, grid: emptyGrid(size), history: empty, marks: empty }` 모두 새로. 빈 grid면 다이얼로그 스킵 즉시 변경. fog 토글·반경은 grid 영향 0이라 항상 즉시.
- **`SettingsPanel` 단순화** — `onStart` props 제거 (만들기 시작 버튼 없어짐). `settingsIntro` 텍스트 제거. props 표현 단순, 분리 컴포넌트 유지(가독성). client-shell이 비대해지지 않게.
- **localStorage hydrate 변경** — `loaded.grid.length === 0`이면 `emptyGrid(loaded.size)`로 자동 채움 (이전엔 Step1 startButton 클릭이 트리거). schemaVersion 영향 0 — MazeProject 구조 무변경.
- **키보드 핸들러 step 의존 갱신** — `step !== 2` → `step !== 1` (만들기 한정 활성). 플레이 단계에서는 play-controls가 방향키/WASD 별도 바인딩 — 충돌 0.
- **handleStart / handleConfirmReset 제거** — 단계 전이 자체가 사라짐. 신규 grid는 hydrate·사이즈 변경 시점에 자동 채움.

### Removed

- `tm.step3` / `tm.startButton` / `tm.settingsIntro` / `tm.drawIntro` i18n 키 — 통합으로 무용. Messages 타입 + ko/en 본문 모두 제거. (실제 사용처 0 grep 확인.)
- Step1→Step2 reset 확인 다이얼로그 경로 폐지. `ResetConfirmDialog` 컴포넌트는 그리드 초기화·사이즈 변경 두 인스턴스에서 재사용 (0.6.0 props 일반화 활용).

### Decided

- **2-step (만들기/플레이) vs 모드 토글** — 단계 의미가 본질적으로 다름(편집 vs 플레이) → 단계 라벨 유지. 모드 토글은 mental load 추가만.
- **빈 grid 자동 채움 시점** — hydrate. 이전 Step1 startButton 트리거를 hydrate로 이동. 페이지 진입과 동시에 그리기 가능.
- **사이즈 변경 = grid + history + marks 모두 새로** — 다른 사이즈 grid 참조하는 stroke 호환 X(history 깨짐 방지). marks도 좌표 기반이라 사이즈 바뀌면 무효 — 클리어. 사용자가 명시 확인하면 그게 의도.
- **SettingsPanel 분리 유지** — 폐기·인라인 대신 props 단순화. client-shell이 이미 크고, 분리 컴포넌트가 가독성에 유리. 통합 화면에서 unconditional 렌더.

### Notes

- **step 리터럴 전수 재번호** — `disabledSteps`(`[3]→[2]`) / 키보드(`!== 2 → !== 1`) / 플레이 뷰 조건부(`step === 3 → step === 2`) / WinDialog 복귀(`setStep(2) → setStep(1)`) / hydrate 복원 로직 / play-mode 주석. grep 전수 확인 후 누락 0.
- 점수 알고리즘 / SCORE_TUNING / fog / play.ts / play-canvas / undo·redo 로직 / 검증 BFS — 무변경 (회귀 0 보장).
- 회귀 점검: 키보드는 만들기 단계만, 플레이는 방향키. 플레이 진입 시 만들기 단축키 unmount. 충돌 0.

## [0.7.1] — 2026-05-23

### Changed

- **PathCommitButton 위치 — 그리드 위 → 아래**. 0.5.1에서 검증·점수 패널에 적용한 "가변/contextual 요소는 그리드 아래" 원칙을 길 도구 commit 박스에도 확장. 그리드 위에 가변 박스가 있으면 박스 등장·소멸·높이 변화가 그리드를 위아래로 밀어 사용자가 그리던 셀 위치를 잃음. 그리드 아래 순서: MazeGrid → PathCommitButton(contextual) → ValidationPanel(상시).
- **검증·점수 패널 위치 확인** — 0.5.1 그리드 아래 배치가 0.7.0 P3c-2 레이아웃 변경 후에도 유지됨 (회귀 0).

### Changed (시작점 ↔ 플레이어 아이콘 분리)

- **시작점 타일 아이콘 — User → Footprints** (`lib/maze/render/default.ts` TILE.START 분기 + `lib/maze/render/icons.ts` `ICON_FOOTPRINTS` 추가). "남은 자국 = 출발 지점" 의미.
- **플레이어 마커 — User 유지** (`renderPlayer`). "움직이는 사람"이 출발 지점의 자국에서 떠난 시각 메타포.
- **도구 팔레트 START 버튼 — Footprints**. 0.6.1의 "버튼 = 맵 아이콘" 원칙으로 `MAZE_TOOL_ICONS.START`도 Footprints. `lib/maze/icons.ts` 갱신.
- **도착점(Flag) · 길 도구(Route) · 벽(Square)** — 무변경. 4개 아이콘 모두 명확히 구분.

### Decided

- **시작점 = "남은 자국", 플레이어 = "사람"** — 두 시각을 분리하면 Step3 진입 시 출발점 자국이 보존된 채로 사람이 떠나는 메타포가 자연. 같은 User 두 개일 때 "어느 게 어디"가 헷갈리던 문제 해소.

### Notes

- ICON_FOOTPRINTS는 lucide-react v1.14.0 `icons/footprints.mjs`에서 4 path 원소 그대로 임베드(ISC). 근사·재구성 없음.
- 동작 로직(history·undo·commit·검증·점수·플레이) 무변경 — UI 정리만.

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
