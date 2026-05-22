# 언어 창조기 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동. 본 문서는 후속 MVP task의 **단일 출처**.

## V1 MVP (status "coming-soon" → "live" 전환까지)

### 인프라

- [ ] **캡처/렌더** — 픽셀 에디터·타자기를 `<canvas>` 기반으로 렌더, 캡처는 `canvas.toDataURL` — 외부 캡처 라이브러리 미사용. DOM 격자 방식이 불가피하다고 판명될 경우에 한해 `modern-screenshot`을 fallback 후보로 (html2canvas는 동일 환경 빈 PNG 이력으로 제외 — lineup-builder CHANGELOG 0.5.0).
- [ ] `app/tools/language-maker/page.tsx` (Server Component, client-shell 패턴)
- [ ] `app/tools/language-maker/client-shell.tsx` (`"use client"`)
- [ ] tools-registry status `"coming-soon"` → `"live"` 전환 (page.tsx 생성과 같은 commit, README route collision 표 준수)
- [ ] `TOOLS.md` 도구 목록 인덱스에 추가 (live 전환 시)

### 데이터 / 상태

- [ ] 글리프 타입 정의 (id, 픽셀 비트맵, 매핑 트리거 문자열)
- [ ] localStorage hydrate + persist + schemaVersion 마이그레이션 (stock-sim/supp-plan 패턴, PATTERNS.md)

### UI 컴포넌트

- [ ] 무지 슬롯 관리 (글리프 추가/수정/삭제, 글자 수 자유)
- [ ] 픽셀 에디터 (8×8 또는 16×16 캔버스, 단순 드로잉)
- [ ] 1:1 치환 매핑 UI (글리프 ↔ 트리거 문자열)
- [ ] 바벨 타자기 (실시간 변환 출력) + `canvas.toDataURL` PNG 캡처/다운로드
- [ ] 스텝 진행 UI (1 슬롯·매핑 → 2 그리기 → 3 타이핑)
- [ ] 다크모드 대응 (brennhub 공통, 픽셀 아트 다크 배경 최적화)
- [ ] 공유 패턴 재사용 — 신규 컴포넌트 만들기 전 PATTERNS.md 확인

### 통합 (필수 — BRENNHUB.md § 6 통합 체크리스트)

- [ ] feedback 통합 — `FeedbackTool` 타입 + `feedback-button.tsx` pathname 매핑 + `feedback-dialog.tsx` toolOptions + `api/feedback/route.ts` TOOLS enum + admin page 라벨 + i18n `feedback.toolLanguageMaker`
- [ ] i18n — `languageMaker.*` namespace (UI 문자열 전체 ko/en)

### 검증

- [ ] `npm run build` — `/tools/language-maker`가 별도 정적 row로 emit 확인 (route collision 없음)
- [ ] 다크/라이트 양쪽 확인 / feat→dev→main 머지·push

## V2 후보 (V1 효능감 검증 후 별도 task)

- [ ] **스타터 팩 프리셋** — 미리 만들어진 글리프 세트로 시작 (백지 부담 완화).
- [ ] **랜덤 대칭 생성기** — 대칭 패턴 기반 글리프 자동 생성.

## 도메인 결정 (MVP task 진입 전 확정 필요)

- 픽셀 그리드 크기 — 8×8 / 16×16 / 사용자 선택. (현재 README는 두 옵션 병기)
- 트리거 단위 — 글자 단위 / 단어 단위 / 둘 다 허용 시 변환 우선순위(최장 매칭 등).
- 매핑 안 된 입력 처리 — 원문 그대로 통과 / 빈칸 / placeholder 글리프.

## 출처

- 외부 기획서 (Brenn 수령, 2026-05-21) + brennhub 외부 기획서 필터 7개 적용 결과.
- 필터 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당 (클라이언트 + localStorage 완결). tools-registry / feedback / i18n / 도구 폴더 문서 3종 누락분은 본 1단계 task + MVP task로 분담.
- V1 스코프는 의도적 축소 — 스타터 팩·랜덤 대칭 생성기는 V2 보류.
- 캡처 방식 = canvas 네이티브로 확정 (기획서 명세 html2canvas → 정정). 근거: CHANGELOG `[0.1.0]` Decided 항목.
