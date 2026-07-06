# Changelog — flail

## 0.2.0 — 랭킹(leaderboard) 추가 (2026-07-05)
- 게임오버 시 점수(=kills) 제출(익명 이름 입력) + 상위 10 표시. 공용 랭킹 API/엔진 훅(getResult)·오버레이, 게임 로직 무수정.

## 0.1.0 — Flail 개별 tool 출시 (2026-07-05)
- 아케이드 통합 tool의 탭에서 독립 tool `/tools/flail`로 분리. 게임 로직(공용 Engine + flail)은 무수정, 공용 단일-게임 셸(game-shell)로 마운트.
