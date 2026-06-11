# 타로 테이블 (Tarot Table) CHANGELOG

## 0.2.0 — Task 2: 의식 플로우 상태머신 S0~S7 (2026-06-11)

**What** — 단일 페이지 의식 상태머신: S1 그라운딩(7s 고정 호흡 펄스) → S2 질문(필수+도메인 칩) → S3 셔플(드래그만, 자동 애니메이션 없음) → S4 컷(두 지점 분할 + 더미 탭 순서 = 덱 순열, SHA-256 봉인) → S5 배치 → S6 정/역 2층 선택(1.5s 홀드 링) → S7 순서 강제 플립 오픈 → 임시 결과. S8 리딩·영속은 Task 3.

**Why** — "느림이 곧 제품": 비가역(컷 이후 복귀 불가)과 대가(질문 적기·직접 셔플·홀드 확정)가 진지함을 만든다. 커밋-리빌 봉인은 "고른 뒤 결과를 바꾸지 않음"의 시스템 증명.

**Where**
- `lib/tarot/ritual.ts` — RitualRng(crypto ^ 인터랙션 엔트로피 — XOR이라 약화 불가) · Fisher-Yates · 봉인 payload 정본(`tarot-seal-v1|order|bits|nonce`) · `finalOrientation`(2층 XOR — 리뷰 최우선)
- `lib/tarot/ritual-state.ts` — Stage 리듀서. seal != null 이후 복귀 액션 전부 거부(비가역 단일 권위). 난수는 payload 주입(StrictMode 안전)
- `app/tools/tarot/components/stages/*` — 스테이지 7종 + hold-button + flip-card(rotateY 3D) + result-temp
- `app/globals.css` — `--animate-tarot-breathe` keyframes (@theme)

**결정 기록**
- 질문 수정은 셔플 단계까지만(BACK_TO_QUESTION) — 컷 시작 후엔 처음부터.
- RESET은 질문·도메인 포함 전체 초기화 — "같은 질문 두 번 묻지 않기" 정합.
- 해시는 전체 덱(22장+22비트) — S5는 top 3 분배만, 재선택 불가 증명. S6 선택은 해시 불포함(선택 전 상태 증명).
- 새로고침/bfcache = 리셋 (메모리 상태만 — 의도된 Task 2 범위, 영속은 Task 3).
- 진행 표시 부재는 의도: 그라운딩 진행바 금지, 셔플 카운터 없음(3회 후 버튼 등장만).

**Verify** — 빌드 그린 · 전 플로우 수동 통과 · 2층 검증(정방향 선택에도 역방향 카드 출현 = 숨은 비트 보존) · 봉인 해시 콘솔 재계산 일치 · `rg "fetch\(|console\." app/tools/tarot lib/tarot` 0건(질문 프라이버시).

## 0.1.0 — Task 1: 스캐폴드 + 카드 사전 데이터 + 카드 컴포넌트 v1 (2026-06-10)

**What** — 도구 기반 작업: 레지스트리 등록(live, lifestyle) · S0 입구 골격 · 사전 v0.3 → typed const 이관 · i18n(ko/en) · 피드백 통합 · 카드 컴포넌트 v1. 의식 플로우 S1~S8은 Task 2/3.

**Why** — 결정론 타로의 신뢰축은 "변하지 않는 사전" — 데이터 레이어를 가장 먼저 동결·검증해야 이후 플로우(Task 2)와 리딩(Task 3)이 그 위에 선다.

**Where**
- `lib/tarot/{types,cards,glyphs}.ts` — §6.1 스키마 / 생성된 22장 / 로마자·점성 글리프
- `app/tools/tarot/scripts/gen-cards.mjs` — DICTIONARY.md 파서 + assert(22장·44방향·키워드 222·도메인 enum·수비학==id) + `--force` 덮어쓰기 가드
- `app/tools/tarot/{page,client-shell}.tsx` + `components/tarot-card.tsx` — S0 + 카드 v1(CSS 타이포 앞면 / 사선 격자 뒷면, foreground 토큰으로 양 테마 자동)
- 등록처: tools-registry / hub ICON_BY_SLUG(MoonStar) / messages.ts(tarot ns + tools.tarot + feedback.toolTarot) / feedback dialog·api·admin / TOOLS.md

**결정 기록**
- 카테고리 lifestyle — saju-naming과 "결정론 운세 클러스터" 인접 배치 (기획 §2).
- 변환 스크립트 **보존** — tag-it 선례 + "출처 있는 사전"의 감사 추적 + v2 마이너 아르카나 파이프라인. 유실 위험은 `--force` 가드로 차단.
- 원소 글리프는 연금술 유니코드(U+1F70x) 회피 → CSS 삼각형 (모바일 tofu 방지). 황도 12궁은 VS15로 텍스트 표현 강제.
- `?debug=1` 덱 프리뷰 — 편집장 dev 검수용 쿼리 게이트 (tag-it 0.8.9 선례). S5~S7 구현 시 제거 가능.

**Verify** — `npm run build`에서 `/tools/tarot` 별도 row · gen-cards.mjs assert 전체 그린 · 기획 §6.2 기준 카드(힘·죽음) spot-diff 일치 · mute 조합 9건 로그.
