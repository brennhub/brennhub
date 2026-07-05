# Changelog — arcade

## 0.3.1 — beacon 빔 사거리 제한 · 등대 피격 연출 · 미러 공격 적 겹침 방지 (2026-07-05)
- 메인 빔 사거리를 제한(화면 밖 적은 안 맞고, 적이 안으로 들어와야 처리). +RANGE 성장은 그대로.
- 등대(코어·미러)가 피격되면 살짝 흔들리며 빨간 플래시(과하지 않게).
- 미러 공격 적(레이더)이 미러에 파고들지 않고 가장자리에서 부딪히며 공격.

## 0.3.0 — beacon 대형 업데이트: 미러 HP·파괴, 미러 노리는 적, 미러 조작, 난이도 재조정 (2026-07-05)
- 난이도 재조정(약간 상향) + MIRROR 상한 6개 · FLASH 충전 느리게 · 미러 사거리 짧게 시작(+RANGE로 성장) · 웨이브 10마다 기둥 +1(최대 8).
- 미러에 체력/파괴 추가. 새 적 **레이더(주황)**가 가장 가까운 미러를 부수며, 파괴되면 슬롯이 비어 다시 설치 가능(레이더도 빛으로 방어).
- 미러 **좌클릭 = 회전 방향 반전**, **우클릭 = 제거 후 대기로 환급**(재배치). 우클릭 시 브라우저 메뉴 억제.

## 0.2.2 — beacon 장애물 배치 개선 + 장갑 적 완화 (2026-07-05)
- 장애물(회색 기둥) 2개가 코어에서 최소거리·서로 최소간격을 두도록 재추첨 배치(코어 근처/서로 붙음 방지).
- 보라 장갑형 적 완화: 체력↓·빛 데미지 더 잘 먹음·출현 빈도↓. 수치는 전부 `TUNE`(obstacleCoreGap/obstacleGap/umHP/umBeamMult/umSpawnBase/umSpawnRamp).

## 0.2.1 — beacon 미러 직접 배치 + 난이도 추가 완화 (2026-07-04)
- 미러 등대가 랜덤 생성 대신 **플레이어가 직접 배치**. 시작 시 2개 배치(고스트 미리보기, 유효=파랑·무효=빨강), +MIRROR는 배치 대기로 쌓여 필드 탭으로 놓음. 상한(MIRMAX)은 배치+대기 합산. 하단 버튼 탭이 배치보다 우선.
- 난이도 추가 완화(TUNE 값만): 코어 체력↑·스폰 느려짐·적 속도↓·접촉 피해↓. 미러 점등·연쇄 반사 로직은 불변(배치된 미러에 그대로 적용).

## 0.2.0 — 게임 5종 추가: FLAIL · CIRCUIT · REPEL · LURE · SINGULARITY (2026-07-04)
- beacon과 동일 패턴으로 5종 이식(각 `lib/arcade/games/<id>.ts` + 상단 TUNE 블록, 로직·수치·색 원본 유지, 캔버스 텍스트 영어). `index.ts`에 6종 등록·탭 라벨.
- 상단 탭 6개로 전환(활성 게임 1개만 tick). 게임별 aspect(0.64~0.7)라 전환 시 컨테이너 비율·fitCanvas 자동 갱신.
- 소스 GDD(`_import/batch11.html`)는 `.gitignore` 처리(버전관리 제외).

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
