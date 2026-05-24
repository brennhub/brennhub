# 아케이드 슈터 — BACKLOG

MVP 이후 우선순위 후보. 인터페이스 자리는 MVP에서 이미 둠 (WeaponDef·EnemyDef.weapon? 등).

## 게임 콘텐츠

- [ ] **파츠 교체 시스템** — `Loadout = { weapon: id }` localStorage 영속. 시작 화면에서 무기 선택. `playerWeapon = WEAPONS[loadout.weapon]` 한 줄 교체.
- [ ] **무기 추가** — spread (3-way 분산), laser (관통), rapid (cooldown↓ + damage↓).
- [ ] **적 종류 추가** — turret(고정 + 발사), runner(빠름·hp1), tank(느림·hp5).
- [ ] **적 발사** — EnemyDef.weapon 부여 + spawn.ts에서 enemy lastFireMs 게이트. 충돌 분기는 이미 loop.ts에 존재.
- [ ] **다중 웨이브 시퀀스** — `WAVES.alpha → beta → gamma` 순차 + loopCount별 난이도 증가 (속도 / hp / spawn 밀도).
- [ ] **보스** — 큰 hitbox + 다단 hp + 패턴 발사. WaveDef.boss?: BossDef.
- [ ] **파워업 픽업** — 적 격추 시 일정 확률로 떨어지는 아이템 (cooldown 일시↓, shield, 1up). 새 EntityKind = "pickup".

## 시청각

- [ ] **사운드** — Web Audio 합성 (음원 파일 0). maze 도구의 `lib/maze/sound.ts` 패턴 차용. 발사·피격·격추·게임오버.
- [ ] **음소거 토글** — 우상단 + localStorage 영속. i18n soundMute/soundUnmute 키 추가 필요.
- [ ] **픽셀아트 플레이어 스프라이트** — Visual `sprite` variant 활성. 해당 draw만 `imageSmoothingEnabled = false`.
- [ ] **파티클** — 격추 시 작은 폭발 (rect 12개 fade).
- [ ] **스크롤 배경** — 현 starfield 외 nebula 레이어 (parallax).

## 메타 / 인프라

- [ ] **D1 리더보드** — `ScoreStorage` interface는 그대로, `D1ScoreStorage` 새로 만들어 싱글톤 교체. `MAZE_DB`처럼 별도 binding (`SHOOTER_DB`) + `app/api/shooter/score/route.ts`.
- [ ] **닉네임 입력** — 게임오버 시 최고점 갱신했으면 nickname prompt.
- [ ] **게임플레이 통계** — 평균 생존 시간 / 격추 종류별 카운트. 로컬만.
- [ ] **튜토리얼 모드** — 첫 진입 시 짧은 시나리오 1개.

## 코드 품질

- [ ] **update() 결정론 테스트** — 동일 intent 시퀀스 → 동일 state. unit test (vitest 도입 필요).
- [ ] **투사체 풀링** — `projectilePool` 도입해 alloc 압박 줄이기 (현재 MVP 규모는 불필요).
- [ ] **렌더 fps 카운터** — 디버그용 (제거 가능 토글).
