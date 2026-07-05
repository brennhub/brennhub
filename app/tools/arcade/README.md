# 아케이드 — 코어 디펜스 (`/tools/arcade`)

도형만으로 그린 코어 디펜스 미니게임 모음. 단일 캔버스 위에서 **공용 Engine**이 활성 게임 1개만 tick 한다. 외부 그림·라이브러리 의존 0 (도형·발광만).

## 게임 목록 (6종, 상단 탭 전환)
- **BEACON (등대)** — 회전 거울 반사로 사각을 쓸어 적을 태우는 코어 디펜스. 드래그 조준 + 거울 증설·위력·사거리.
- **FLAIL (사슬추)** — 홀드로 가속하는 회전 추, 드래그로 요요 발사.
- **CIRCUIT (회로)** — 노드를 드래그로 연결해 감전링크·벽·감속·자동포·EMP 방어망 구성.
- **REPEL (격퇴)** — 스와이프로 적을 밀어 장외·가시벽으로 연쇄 처치.
- **LURE (유인)** — 미끼로 적을 끌고 지뢰로 쓸기, 돌격 적 주의.
- **SINGULARITY (특이점)** — 블랙홀을 놓고 키우고 슬링샷으로 던진다.

활성 게임 1개만 tick. 게임별 aspect 다름(0.64~0.7) — 탭 전환 시 컨테이너 비율·fitCanvas가 활성 게임 기준으로 자동 갱신.

## 아키텍처 (단일 canvas + 공용 Engine)
- `lib/arcade/engine.ts` — 공용 helpers + `Engine`. React import 0. 활성 게임 1개만 tick.
  - 계약: `defineGame(id, api, aspect)` · `attach(canvas)` · `setActive(id)` · `resize(W,H)` · `getAspect/activeAspect` · `start()` · `destroy()`.
  - 게임은 **논리좌표(W,H)** 로만 그린다. DPR/backing/transform은 shell `fitCanvas`가 처리.
  - 입력: canvas pointer(down/move/up) + window keydown 1세트를 엔진이 잡아 활성 게임 `onDown/onMove/onUp/onKey`로 디스패치. `wantsMove`면 버튼 없이도 move 전달.
- `lib/arcade/games/<id>.ts` — 게임 1종 = 순수 로직 + 하단 `Engine.defineGame(...)` 1줄. **엔진 수정 0으로 얹힌다.**
- `lib/arcade/games/index.ts` — 게임 side-effect import + selector 목록(`ARCADE_GAMES`).
- `app/tools/arcade/page.tsx` — server shell + `toolMetadata("arcade")`.
- `app/tools/arcade/client-shell.tsx` — `"use client"`. attach→fit→resize→setActive→start · ResizeObserver refit · cleanup destroy.
- `components/arcade/game-canvas.tsx` — forwardRef `<canvas>` + aspect-ratio 컨테이너.

## 게임 추가 (batch 12+)
1. `lib/arcade/games/<id>.ts` 작성 → 파일 끝에서 `Engine.defineGame("<id>", api, aspect)`.
2. `lib/arcade/games/index.ts` 에 `import "./<id>";` + `ARCADE_GAMES` 항목 한 줄.

그게 전부. `engine.ts` · `page.tsx` · `client-shell.tsx` 는 불변. selector가 2종 이상이면 자동으로 탭이 뜬다.

## 조작 (Beacon)
드래그로 빛 조준 · **F** 집속/확산 · **Space** 섬광 · 하단 버튼으로 처치 점수 소비 (+MIRROR/+POWER/+RANGE).

## 원본 / 이식 메모
- 소스: `_import/batch11.html`(GDD) `<script>` 의 shared helpers + "Engine" IIFE + "01 등대(Beacon)" IIFE.
- Engine은 원본을 단일 canvas용으로 리팩터(§아키텍처). Beacon 로직·수치·색·파티클은 원본 그대로, 캔버스 텍스트만 영어로 교체.
- 게임은 자체 다크 팔레트(배경 `#05060c`)로 그린다. 캔버스 밖 React chrome만 사이트 토큰(.dark)을 따른다.
