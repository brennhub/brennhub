# Circuit (회로) (`/tools/circuit`)

회로 — 도형만으로 그린 코어 디펜스. 외부 그림·라이브러리 의존 0.

## 조작
노드를 드래그로 연결(감전링크·벽·감속·자동포·EMP)

## 아키텍처
- 게임 로직: `lib/arcade/engine.ts`(공용 Engine) + `lib/arcade/games/circ.ts` — 무수정.
- 셸: `app/tools/circuit/page.tsx`(server + toolMetadata) → `components/arcade/game-shell.tsx`(공용 단일-게임 셸, gameId=`circ`).
- 캔버스 텍스트는 영어(게임 내부), tool 메타만 ko/en.
