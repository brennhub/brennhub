# Beacon (등대) (`/tools/beacon`)

등대 — 도형만으로 그린 코어 디펜스. 외부 그림·라이브러리 의존 0.

## 조작
드래그로 빛 조준 · 필드 탭으로 미러 배치 · 미러 좌클릭 회전/우클릭 제거 · F 집속/확산 · Space 섬광

## 아키텍처
- 게임 로직: `lib/arcade/engine.ts`(공용 Engine) + `lib/arcade/games/beacon.ts` — 무수정.
- 셸: `app/tools/beacon/page.tsx`(server + toolMetadata) → `components/arcade/game-shell.tsx`(공용 단일-게임 셸, gameId=`beacon`).
- 캔버스 텍스트는 영어(게임 내부), tool 메타만 ko/en.
