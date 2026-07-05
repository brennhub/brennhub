# Changelog — arcade

## 0.1.2 — beacon 미러 등대 간 연쇄 반사 (2026-07-04)
- 켜진 미러의 반사 콘이 다른 미러도 켠다(mirror→mirror 연쇄). 연쇄로 켜진 미러도 적을 태우고 또 다른 미러를 켜, 회전에 따라 커버리지가 동적으로 넓어짐. `TUNE.mirrorChainMaxHops`(기본 5, 0=끄기)로 조절.

## 0.1.1 — beacon 크기·해상도·난이도 조정 (2026-07-04)
- 캔버스 확대(래퍼 max-w 420→860, main max-w-4xl) + 논리 해상도 상향 → 크고 선명하게.
- 렌더 힌트 교정: `image-rendering: pixelated` 제거 (벡터·그라데이션이라 계단 없이 부드럽게).
- 난이도 약간 완화: beacon 상단 `TUNE` 상수 블록 신설(코어 체력·스폰·속도·접촉 피해 등을 한곳에), 초반 여유 + wave 3~4 스파이크 완만.

## 0.1.0 — 아케이드 tool 도입 + 등대(Beacon) (2026-07-04)
- 신규 tool `/tools/arcade` 파이프라인 도입: 단일 canvas + 공용 Engine(활성 게임 1개만 tick).
- `lib/arcade/engine.ts` — 원본 batch11 "Engine" IIFE를 단일 공용 canvas용으로 리팩터 (cvId 제거, DPR/transform은 shell fitCanvas로 이관, `attach`/`resize`/`destroy` 계약 추가, `defineGame` 멱등).
- `lib/arcade/games/beacon.ts` — "01 등대(Beacon)" 이식. 로직·수치·색 원본 유지, 캔버스 텍스트 영어화.
- React 셸: `app/tools/arcade/{page,client-shell}.tsx` + `components/arcade/game-canvas.tsx` (shooter 셸 골격 차용 — fitCanvas·ResizeObserver·cleanup).
- 레지스트리/i18n(ko·en)/아이콘(Joystick)/metadata/releases/feedback/TOOLS 배선.
