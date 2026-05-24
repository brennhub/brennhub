# 아케이드 슈터 — `/tools/shooter`

> UI 표시명은 "아케이드 슈터" (en "Arcade Shooter"). 코드 식별자(slug `shooter`, registry id, 파일 경로)는 불변.

세로 스크롤 갤러그류 슈팅. 플레이어 우주선을 좌우로 움직이며 위에서 내려오는 적을 격추, 생명 3개가 모두 소진되면 게임오버. 같은 웨이브 무한 반복으로 점수가 계속 누적되는 형태 — 최고점을 매번 갱신.

## 화면 구조 (MVP)

- **HUD** — 점수 / 최고점 / 생명(하트 3개) / [시작] / 게임오버 모달의 [재시작]
- **캔버스** — 360×640 논리 좌표 고정. DPR backing store로 고해상도 렌더. 양옆 화살표 컨테이너 안에서 aspect-ratio fit.
- **컨트롤 힌트** — 데스크탑: `← → 이동 / 스페이스 발사`. 모바일: `화면 좌우를 눌러 이동 (자동 발사)`.

## 데이터 주도 (Data-driven)

적·무기·투사체·웨이브는 **TS object literal**로 정의. 코드는 데이터를 해석. 파츠 시스템 확장 시 `playerWeapon = WEAPONS[loadout.weapon]` 한 줄 교체로 흡수.

- `lib/shooter/data/weapons.ts` — `WEAPONS: Record<id, WeaponDef>` (MVP: pulse 1종)
- `lib/shooter/data/enemies.ts` — `ENEMIES: Record<id, EnemyDef>` (MVP: ghost·bug 2종)
- `lib/shooter/data/waves.ts` — `WAVES: Record<id, WaveDef>` (MVP: alpha 1종, 무한 반복)

## Visual 추상화

한 인터페이스 `Visual` 뒤에 3 variant:
- `primitive` (rect / circle) — 탄, fallback
- `lucide-raster` — 부팅 시 OffscreenCanvas에 lucide iconNode stroke → ImageBitmap 캐시. (iconId, tint) 조합별로 enumerate(`ASSET_MANIFEST`). render는 plain `drawImage`만 호출 — 매 frame compositing 없음.
- `sprite` — MVP 미사용. 추후 픽셀아트 플레이어 자산 도입 시 활성.

적 = `lucide-raster` (ghost violet, bug red), 플레이어 = `lucide-raster` (rocket blue). lucide iconNode 임베드 방식은 `lib/maze/render/icons.ts` 패턴과 동일.

## 게임 루프

- `update(state, intent, STEP_MS)` / `render(ctx, state, assets)` 분리. 순수 함수 (testable).
- **Fixed timestep 60Hz** — rAF tick에서 누적 dt를 16.67ms 단위로 step. 최대 5 step/tick으로 스파이럴 가드.
- 상태 모델: `GameState`는 **mutable ref가 owner** — React state 아님.
  - 캔버스 render는 매 frame ref에서 직접. React 리렌더 0회.
  - HUD는 `projectHud()` 결과 diff 시에만 `setHud(snap)` 콜백.
- 충돌: brute-force AABB. quadtree 등 공간 인덱스 없음 (MVP 규모 1000 pairs/frame).
- 투사체 배열: 끊김 보이면 in-place mutation 허용. immutability 도그마 X.

## 입력

`InputController` interface — `start() / stop() / getIntent()`.
- `KeyboardInput` — `← → A D` 이동, `Space` 발사. preventDefault.
- `TouchInput` — 캔버스 좌/우 2-zone hold. **auto-fire** (`fire: true` 고정).
- `CompositeInput` — OR 합성. MVP는 keyboard + touch 동시 활성.

`Intent.fire`는 타입에 유지 — 차후 charged shot 등 edge 검출 무기 도입 여지.

## 저장 (ScoreStorage)

```typescript
interface ScoreStorage {
  getHighScore(): Promise<number>;
  saveScore(score: number): Promise<void>;
}
```

`LocalScoreStorage` (key: `brennhub-shooter-highscore`) + 싱글톤 `scoreStorage` export. 미래 D1 도입 시 `D1ScoreStorage` 새로 만들고 export 한 줄만 교체 — 사용처는 인터페이스로 접근. supp-plan의 `PersonalScheduleStorage` 패턴 동일.

## 캔버스 / DPR

```typescript
canvas.width  = cssW * dpr;
canvas.height = cssH * dpr;
ctx.setTransform(canvas.width / LOGICAL_W, 0, 0, canvas.height / LOGICAL_H, 0, 0);
// 모든 update/render는 항상 (0,0)~(360,640) 논리 좌표만.
```

`imageSmoothingEnabled`는 기본값(on) 유지 — lucide 선화에 적합. 추후 픽셀아트 스프라이트 도입 시 그 draw만 별도 처리.

## 파일 구조

```
app/tools/shooter/
  page.tsx                # thin server shell
  client-shell.tsx        # mount + assets/input/loop orchestrator
  README.md / BACKLOG.md / CHANGELOG.md

lib/shooter/
  types.ts                # canonical 인터페이스 + 상수
  loop.ts                 # update / render / startGameLoop / makeInitialState
  spawn.ts                # 웨이브 진행 + 무한 반복
  collision.ts            # AABB
  data/
    weapons.ts            # WEAPONS
    enemies.ts            # ENEMIES
    waves.ts              # WAVES + INITIAL_WAVE_ID
  visual/
    icons.ts              # lucide iconNode 임베드 (ISC, ghost/bug/rocket)
    raster.ts             # ASSET_MANIFEST + buildVisualAssets()
    render-visual.ts      # drawVisual variant 디스패치
  input/
    types.ts              # InputController interface + helpers
    keyboard.ts           # KeyboardInput
    touch.ts              # TouchInput (2-zone + auto-fire)
    composite.ts          # CompositeInput
  storage/
    types.ts              # ScoreStorage interface
    localStorage.ts       # LocalScoreStorage + scoreStorage 싱글톤

components/shooter/
  game-canvas.tsx         # <canvas> + aspect-ratio + 모바일 zone hint overlay
  hud.tsx                 # 점수·생명·최고점 + 시작/재시작 버튼 + 게임오버 모달
```

> 별도 `touch-pad.tsx`는 미작성 — TouchInput이 캔버스 element에 직접 listener 등록하는 zone-tap 방식이라 별도 D-pad 컴포넌트 불필요. 시각 힌트만 `game-canvas.tsx` 안에 overlay로 통합.

## 차별점 · 확장 계획

- **차별점** — brennhub 다른 도구는 계산기/시뮬레이터/창작 위주. 슈팅 게임은 첫 도전. 도구 카탈로그의 톤 다양성 확보.
- **V2 후보** — 파츠 교체(WeaponDef 교체), 다중 스테이지(WAVES 시퀀스), 파워업, 적 발사(EnemyDef.weapon 부여), 보스, 사운드(Web Audio 합성 — maze 패턴), 픽셀아트 플레이어 스프라이트, D1 리더보드. 상세 [BACKLOG.md](./BACKLOG.md).

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
