# 언어 창조기 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

## V1 MVP (status "coming-soon" → "live") — 완료 (CHANGELOG `[0.2.0]`)

### 인프라

- [x] **캡처/렌더** — 픽셀 에디터·타자기를 `<canvas>` 기반으로 렌더, 캡처는 `canvas.toDataURL` — 외부 캡처 라이브러리 미사용.
- [x] `app/tools/language-maker/page.tsx` (Server Component, client-shell 패턴)
- [x] `app/tools/language-maker/client-shell.tsx` (`"use client"`)
- [x] tools-registry status `"coming-soon"` → `"live"` 전환 (page.tsx 생성과 같은 commit)
- [x] `TOOLS.md` 도구 목록 인덱스에 추가

### 데이터 / 상태

- [x] 글리프 타입 정의 (id, 16×16 비트맵, 매핑 트리거 문자열) — `lib/language-maker/types.ts`
- [x] localStorage hydrate + persist + schemaVersion 마이그레이션 — `lib/language-maker/storage.ts` (supp-plan `migrate()` 패턴)

### UI 컴포넌트

- [x] 무지 슬롯 관리 (글리프 추가/수정/삭제, 글자 수 자유) — `slot-panel.tsx`
- [x] 픽셀 에디터 (16×16 `<canvas>`, 클릭/드래그 토글) — `pixel-editor.tsx`
- [x] 1:1 치환 매핑 UI (글리프 ↔ 트리거 문자열) — `slot-panel.tsx`
- [x] 바벨 타자기 (실시간 변환 출력) + `canvas.toDataURL` PNG 캡처/다운로드 — `typewriter.tsx`
- [x] 스텝 진행 UI (1 슬롯·매핑 → 2 그리기 → 3 타이핑) — `step-nav.tsx`
- [x] 다크모드 대응 — `useTheme()` 구독 (기존 theme-provider 재사용)
- [x] 공유 패턴 재사용 — Button/Tabs 검토, theme-provider·i18n provider 재사용

### 통합 (BRENNHUB.md § 6 통합 체크리스트)

- [x] feedback 통합 — `FeedbackTool` 타입 + `feedback-button.tsx` pathname 매핑 + `feedback-dialog.tsx` toolOptions + `api/feedback/route.ts` TOOLS enum + admin `TOOL_LABEL` + i18n `feedback.toolLanguageMaker`
- [x] i18n — `languageMaker.*` namespace (UI 문자열 전체 ko/en)

### 검증

- [x] `npm run build` — `/tools/language-maker`가 별도 정적 row로 emit (route collision 없음)
- [ ] 다크/라이트 양쪽 확인 / feat→dev→main 머지·push — dev 배포 후 사용자 시각 검증

## V1.1 — 문자 만들기 UI 재설계 — 완료 (CHANGELOG `[0.3.0]`)

- [x] 스텝 3 → 2 (문자 만들기 / 타이핑) — `step-nav.tsx`
- [x] 카드 그리드 — `slot-panel.tsx` → `character-grid.tsx` 재작성 + `character-card.tsx` 신규
- [x] 픽셀 에디터 모달화 — `pixel-editor.tsx` (edit-dialog/feedback-dialog 모달 패턴 재사용)
- [x] 드래그 재정렬 — Pointer Events 자체 구현 (외부 dnd 라이브러리 0). 마우스 6px 임계값 / 터치 길게 누르기(280ms)
- [x] 용어 user-facing "문자"화 (코드 식별자 `Glyph`·`glyph.ts`·`glyphs` 불변)
- [x] i18n `languageMaker.*` namespace 재정비 (ko/en)
- [x] 문서 3종 V1.1 갱신
- [ ] dev 검증 — V1 회귀(기존 데이터 손실 0) / 다크·라이트 / 모바일(터치 드래그·모달, 문자 많을 때 스크롤 vs 드래그)

## V2 후보 (효능감 검증 후 별도 task)

- [ ] **스타터 팩 프리셋** — 미리 만들어진 문자 세트로 시작 (백지 부담 완화).
- [ ] **랜덤 대칭 생성기** — 대칭 패턴 기반 문자 자동 생성.
- [ ] **멀티 언어 프로젝트** — 문자 컬렉션 복수 관리 (V1은 단일 언어).
- [ ] 픽셀 그리드 크기 선택 (8×8 등) — V1은 16×16 고정.
- [ ] 카드 사이 "+" 삽입 존 — V1.1에서 제외 (trailing "+" 카드 + 드래그로 충족). 문자 수가 많아지면 재검토.
- [ ] **키보드 드래그 재정렬 (접근성)** — 현재 카드 재정렬은 Pointer Events 기반이라 키보드 비대응. 향후 접근성 개선 후보. 순서는 변환 결과에 영향 없어 V1.1 비차단.

## 도메인 결정 (해결 완료)

- 픽셀 그리드 크기 — **16×16 고정** (8×8 토글 없음, 자문 확정).
- 트리거 단위 — 글자·단어 모두 허용, **longest-match**(가장 긴 매칭 우선)로 토큰화.
- 매핑 안 된 입력 — **원문 글자 그대로 통과** (canvas `fillText` 회색 렌더로 미매핑 구간 인지).
- 캡처 방식 — **canvas 네이티브 `toDataURL`** (외부 라이브러리 0).
- 다크모드 테마 감지 — **`useTheme()` 구독** (기존 theme-provider 재사용).
- PNG 파일명 — `language-maker-<YYYY-MM-DD>.png` (`<slug>-<date>` 컨벤션).

## 출처

- 외부 기획서 (Brenn 수령, 2026-05-21) + brennhub 외부 기획서 필터 7개 적용 결과.
- 필터 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당 (클라이언트 + localStorage 완결).
- V1 스코프는 의도적 축소 — 스타터 팩·랜덤 대칭 생성기는 V2 보류.
- 등록 commit: `e8ec31e` (placeholder) → V1 MVP (코어 + 통합).
