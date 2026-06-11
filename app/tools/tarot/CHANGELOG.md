# 타로 테이블 (Tarot Table) CHANGELOG

## 0.3.0 — Task 3: S8 리딩 + 저장 + 공유 + 사전 열람 (2026-06-11)

**What** — ① **S8 리딩**: 질문 원문 + 도메인 뱃지(대가의 회수), 카드별 essence(항상) → 매칭 키워드 강조 + gloss(뱃지와 동일 강조색 = 출처 시각 연결) → 비매칭 접힘 토글(강조만, gloss는 매칭만) → mute 정직 문구 → Waite 원문 토글(1910 출처) ② **검증 토글**: payload 문자열(order+nonce) 그대로 공개, 표시용(pickedIndices·choice)은 "해시에 포함되지 않음" 구분 명시, "직접 재계산해 비교할 수 있습니다" 안내 ③ **저장**: 마지막 리딩 1건 localStorage(봉인 원본 포함) + S0 '지난 리딩 보기' ④ **공유 PNG**: canvas 직접 렌더 1080×1350, share 시트 → 다운로드 폴백 ⑤ **사전 열람** `/tools/tarot/cards`: 22장 정/역 essence·키워드(도메인 태그)·gloss·Waite 원문 전체 공개.

**Why** — 투명성 UI 원칙의 완성: 해석이 어느 사전 의미에서 왔는지 화면으로 증명(키워드↔도메인 색 연결), 사전 전체 공개는 "우리는 지어내지 않는다"의 실체, 검증 토글은 커밋-리빌의 사용자 접점.

**Where** — `components/stages/reading.tsx`(result-temp 대체) · `lib/tarot/reading-storage.ts` · `lib/tarot/share-image.ts` · `app/tools/tarot/cards/{page,cards-shell}.tsx`

**결정 기록**
- 저장 스키마에 cardIds 명시 + 로드 시 order/pickedIndices 유도값과 일관성 검사 — 불일치 = 손상 = 조용히 폐기.
- `?debug=1` 전면 제거 — 봉인 훅은 검증 토글이, 덱 그리드는 사전 열람이 대체.
- 공유 이미지에 질문 파라미터 자체가 없음 — "질문 미포함"이 코드로 보장. share 실패 시 다운로드 폴백(AbortError=사용자 취소만 종료).
- 사전 페이지 크롬은 ko/en(편집장 정정 — "UI 크롬 ko/en 필수" 합의 그대로), 본문은 ko 전용 유지. server page(metadata) + client shell 구성.

**Verify** — 커밋별 빌드 그린 · `/tools/tarot/cards` 빌드 별도 row · playwright(시스템 Edge, `--no-save`, 44건 PASS): 저장 리딩 주입으로 여사제×돈 mute / 바보×돈 매칭+gloss 결정적 확인 · 전체 키워드 펼침 · Waite 출처 · 검증 토글 payload 재계산 = 표시 해시(주입·실플로우·새로고침 복원 3경로) · 공유 PNG 1080×1350 비어있지 않음 + 파일명 · 사전 22장 + Waite 44건 + 크롬 en 전환 · 390px 오버플로 0 · 양 테마 스크린샷.

## 0.2.1 — Task 2.5: 정/역 단층 정정 + dev 검수 피드백 (2026-06-11)

**What** — ① 정/역 선택 **단층 전환**: S6에서 고른 방향이 세 장 전체를 직접 결정 — 숨은 방향 비트·2층 XOR 전면 폐기, 봉인 payload 개정(`tarot-seal-v1|order|nonce`), S6 카피 교체 ② S3 셔플 **스월**: 드래그 중 레이어 카드가 스택 중심 궤도 회전(방향 = 드래그 회전 부호, 반경 28/42/56px), 포인터 업 0.5~1초 감속 정지 ③ S5 **스프레드 선택**: 덱 3탭 자동 배치 폐기 — 22장 뒷면 펼침(11×2 호)에서 3장 직접 탭 = 과거/현재/미래 ④ **SealBadge**: 64자 생짜 노출 → 앞 8자 축약 + 탭 시 전체+설명 1줄 (S4·임시 결과 공용).

**Why** — 편집장 dev 실물 검수(2026-06-11) 확정 사항. 단층: 선택의 무게는 메커니즘 복잡성이 아니라 **비가역**에서 나온다 — 2층은 설명 불가능한 복잡성이었다. 스프레드: top 3 자동 분배는 "내가 골랐다"는 감각이 없었다 — 직접 선택이 대가 의식의 정합. 스월: 셔플 손맛 강화(입력 없으면 완전 정지 — 자동 루프 금지 원칙은 유지).

**Where**
- `lib/tarot/ritual.ts` — `drawOrientationBits`·`finalOrientation` 삭제, `buildSealPayload(deck, nonce)`. 증명 대상 재정의: "카드를 고르기 전에 덱 순서가 고정되어 있었다"
- `lib/tarot/ritual-state.ts` — `Seal.bits` 제거, `dealtCount` → `pickedIndices`(+`DEAL_PICK` 가드: 중복·범위 밖 무시)
- `components/stages/shuffle-stage.tsx` — 스월: 전부 ref+RAF(리렌더 0), 반경은 편집장 dev 체감 후 조정 예정, reduced-motion은 기존 오프셋 폴백
- `components/stages/deal-stage.tsx` — 스프레드: 좌→우 = 봉인 덱 순서 그대로(추가 난수 0) — 임의 위치 선택도 커밋-리빌 무결
- `components/seal-badge.tsx` — 신규, cut-stage·result-temp 교체

**결정 기록**
- prod 미출시·Task 3(S8 검증 토글) 미구현 시점의 정정이라 payload 마이그레이션 없음. 버전 문자열은 `tarot-seal-v1` 유지.
- 컷 단계 `rng.mix` 제거 — 방향 비트 draw 폐기로 소비자 없는 죽은 엔트로피.
- 스프레드 레이아웃 재량: 단일 호 22장은 390px에서 탭 폭 ~12px라 오탭 위험 → 11×2 호(스트립 28px) 절충.
- `?debug=1`에 임시 결과 봉인 원본(순서·nonce) hidden 속성 추가 — S8 '검증' 토글 전까지의 커밋-리빌 검증 통로.
- 브라우저 검증에서 발견·수정: 뽑힌 자리 placeholder가 탭을 가로채는 데드존 → `pointer-events-none` (틈으로 보이는 이웃 카드 탭이 통과해야 정직한 인터랙션).

**Verify** — 커밋별 빌드 그린 · node 로직 검증(개정 payload 재해시 일치·리듀서 DEAL_PICK 가드·비가역) · playwright-core(시스템 Edge, `--no-save` 일회, 52건 PASS) 전 플로우 4회: 정/역 선택 각 2회 → 3장 방향 전부 일치 · 스월 드래그 중 활성 + 포인터 업 후 완전 정지 · 스프레드 탭 위치 = 봉인 덱 순서 일치(debug) · 동일 카드 재탭 무시(빈 슬롯) · 4장째 탭 무시 · 봉인 해시 브라우저 재계산 일치 · 배지 축약↔확장 · 라이트/다크 스크린샷 · reduced-motion(스월 0 + 오프셋 폴백) · 390px 가로 오버플로 0.

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
