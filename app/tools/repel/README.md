# Repel (격퇴) (`/tools/repel`)

격퇴 — 도형만으로 그린 코어 디펜스. 외부 그림·라이브러리 의존 0.

## 조작
스와이프로 적을 가시벽·장외로 밀어냄

## 아키텍처
- 게임 로직: `lib/arcade/engine.ts`(공용 Engine) + `lib/arcade/games/repel.ts` — 무수정.
- 셸: `app/tools/repel/page.tsx`(server + toolMetadata) → `components/arcade/game-shell.tsx`(공용 단일-게임 셸, gameId=`repel`).
- 캔버스 텍스트는 영어(게임 내부), tool 메타만 ko/en.
