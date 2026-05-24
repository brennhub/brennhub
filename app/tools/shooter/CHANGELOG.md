# 아케이드 슈터 — CHANGELOG

## 0.1.0 — MVP 스캐폴딩 (2026-05-24)

신규 도구 `/tools/shooter`. 세로 스크롤 갤러그류.

**구조**:
- 데이터 주도 (`lib/shooter/data/{weapons,enemies,waves}.ts`) — 적·무기·웨이브를 TS object literal로.
- Visual 추상화 3 variant (`primitive`/`lucide-raster`/`sprite`). lucide는 부팅 시 (iconId, tint) 조합별 ImageBitmap 베이킹 → render는 plain drawImage.
- 게임 루프 fixed timestep 60Hz (`STEP_MS=16.67`, `MAX_STEPS_PER_TICK=5`). GameState는 mutable ref가 owner — React state 아님.
- 입력 추상화 (`InputController`): keyboard + touch 2-zone auto-fire composite.
- 점수 저장 추상화 (`ScoreStorage` + `LocalScoreStorage` 싱글톤). 미래 D1 교체 한 줄.

**MVP 콘텐츠**:
- 무기 1종 (pulse, cooldown 220ms).
- 적 2종 (ghost·bug) + hsine 이동.
- 웨이브 1개 (alpha — ghost 5 → bug 3) **무한 반복**.
- 충돌: 탄-적, 적-플레이어 (적 발사는 인터페이스만).
- 생명 3 / 피격 1.5초 무적 (깜빡임) / 게임오버 모달 / 재시작.
- 키보드(`←→`/`AD`/`Space`) + 터치(좌/우 zone + auto-fire).
- 최고점 localStorage (`brennhub-shooter-highscore`).

**브렌허브 통합**:
- `lib/tools-registry.ts` shooter 추가 (status: live, hasPage: true).
- i18n shooter namespace + ko/en (`Messages.shooter`, `tools.shooter`).
- Feedback 통합 6곳 (FeedbackTool / button pathname / dialog options / api TOOLS / admin label / `feedback.toolShooter`).

**제외 (BACKLOG)**:
- 파츠 교체 (인터페이스 자리만)
- 다중 스테이지 (WaveDef[] 인터페이스로 1개만 사용)
- 파워업·적 발사·보스·사운드·픽셀아트 스프라이트·D1 리더보드

**기술 세부**:
- 캔버스 논리 360×640, DPR backing store. `imageSmoothingEnabled` 기본값(on) — lucide 선화 적합.
- 충돌은 brute-force AABB. quadtree 등 공간 인덱스 미도입 (MVP 규모 1000 pairs/frame).
- 투사체 배열은 in-place mutation. immutability 도그마 X.
