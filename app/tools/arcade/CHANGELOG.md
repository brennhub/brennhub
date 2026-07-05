# Changelog — arcade

## 0.1.0 — 아케이드 tool 도입 + 등대(Beacon) (2026-07-04)
- 신규 tool `/tools/arcade` 파이프라인 도입: 단일 canvas + 공용 Engine(활성 게임 1개만 tick).
- `lib/arcade/engine.ts` — 원본 batch11 "Engine" IIFE를 단일 공용 canvas용으로 리팩터 (cvId 제거, DPR/transform은 shell fitCanvas로 이관, `attach`/`resize`/`destroy` 계약 추가, `defineGame` 멱등).
- `lib/arcade/games/beacon.ts` — "01 등대(Beacon)" 이식. 로직·수치·색 원본 유지, 캔버스 텍스트 영어화.
- React 셸: `app/tools/arcade/{page,client-shell}.tsx` + `components/arcade/game-canvas.tsx` (shooter 셸 골격 차용 — fitCanvas·ResizeObserver·cleanup).
- 레지스트리/i18n(ko·en)/아이콘(Joystick)/metadata/releases/feedback/TOOLS 배선.
