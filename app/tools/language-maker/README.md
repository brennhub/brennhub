# 언어 창조기 — `/tools/language-maker`

> UI 표시명은 "언어 창조기" (en "Language Maker"). 코드 식별자(slug `language-maker`, registry id, `Glyph` 타입, 파일 경로)는 불변.

사용자가 픽셀로 자신만의 문자를 그리고, 임의의 입력값(글자·단어 등)에 1:1로 매핑해 실시간으로 변환하고 이미지로 공유하는 클라이언트 사이드 도구.

## 목적

게임 세계관 제작자·디자이너·창작자가 자기만의 문자 체계나 암호를 빠르게 디자인하고, 입력 텍스트를 그 문자로 실시간 변환해 이미지로 공유할 수 있도록 한다. 백지에서 시작해 픽셀 단위로 문자를 그리고, 원하는 입력값에 자유롭게 매핑하는 흐름.

출처: 외부 기획서 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## 화면 구조 (V1.1 — 2스텝)

### 스텝 1 — 문자 만들기 (카드 그리드)
- 문자를 카드로 바둑판처럼 배치. 각 카드 = 문자 미리보기 + 트리거 입력칸 + 삭제.
- 카드 미리보기 클릭 → **픽셀 에디터 모달**에서 바로 그리기.
- trailing "+" 카드로 문자 추가 (추가 시 에디터 즉시 열림).
- 카드를 끌어 순서 변경 — 순수 정리용 (변환 결과는 트리거 매칭 기반이라 순서 무관).

### 스텝 2 — 타이핑 (바벨 타자기)
- 입력 텍스트를 매핑된 문자로 실시간 변환, `<canvas>` 렌더.
- longest-match 토큰화 (트리거가 단어여도 가장 긴 매칭 우선). 미매핑 글자는 회색 원문 통과.
- `canvas.toDataURL`로 PNG 저장 (`language-maker-<YYYY-MM-DD>.png`).

## 기술 스택

| 항목 | 채택 |
|---|---|
| 프레임워크 | Next.js 16 App Router |
| 스타일 | Tailwind v4 (CSS-first) |
| 렌더 | React Client Component (`"use client"`) |
| 캡처/렌더 | canvas 네이티브 (`canvas.toDataURL`) — 외부 캡처 라이브러리 없음 |
| 드래그 | Pointer Events 자체 구현 — 외부 dnd 라이브러리 없음 |
| 영속 | localStorage (schemaVersion 마이그레이션) |
| 백엔드 | 없음 — 클라이언트 사이드 완결 |

다른 도구(stock-sim, supp-plan, lineup-builder)와 동일 스택. 별도 백엔드 운영 X.

> **캡처 방식 note** — 픽셀 에디터·타자기를 `<canvas>`로 직접 렌더하므로 CSS 파싱 단계가 없어, lineup-builder가 겪은 DOM-to-image 라이브러리의 Tailwind v4 `lab()/oklab/color-mix` 미파싱 빈 PNG 문제가 구조적으로 발생하지 않는다.

> **드래그/스크롤 note** — 카드 드래그는 마우스 = 6px 이동 임계값, 터치 = 길게 누르기(280ms)로 활성화. 활성 전에는 페이지 스크롤이 정상 동작하고, 드래그 활성 후에만 non-passive `touchmove`로 스크롤을 차단 — 카드가 많아도 모바일 세로 스크롤과 충돌하지 않는다.

## 데이터 구조

```typescript
// lib/language-maker/types.ts
export const GRID_SIZE = 16;       // 16×16 고정
export const SCHEMA_VERSION = 1;

type Glyph = {
  id: string;
  trigger: string;       // 1:1 매핑 트리거 문자열 (글자·단어)
  bitmap: boolean[][];   // 16×16 픽셀 비트맵
};

type LanguageProject = {
  schemaVersion: number; // localStorage 마이그레이션용
  glyphs: Glyph[];       // 배열 순서 = 카드 순서 (재정렬 = 배열 재정렬)
};
```

> V1 = 단일 언어(글리프 컬렉션 1개). localStorage hydrate + persist + schemaVersion 마이그레이션은 stock-sim/supp-plan 패턴 (PATTERNS.md).

## 차별점 · 확장 계획

- **차별점** — 게임 세계관 문자·암호 디자인 용도. 백지에서 시작하는 자유 매핑 + 픽셀 단위 문자 + 실시간 변환·공유. 정해진 알파벳이 아니라 사용자가 0부터 정의한다.
- **V2 후보** — 스타터 팩 프리셋(미리 만들어진 문자 세트), 랜덤 대칭 생성기, 멀티 언어 프로젝트. V1 효능감 검증 후 별도 task.

## 파일 구조

```
app/tools/language-maker/
  README.md / BACKLOG.md / CHANGELOG.md
  page.tsx              # Server Component shell
  client-shell.tsx      # 상태·스텝·모달 오케스트레이션
lib/language-maker/
  types.ts              # Glyph / LanguageProject + 상수
  glyph.ts              # id 생성 · canvas 렌더 헬퍼 · longest-match 토큰화
  storage.ts            # localStorage load/save/migrate
components/language-maker/
  step-nav.tsx          # 2스텝 네비게이션
  character-grid.tsx    # 문자 카드 그리드 + 드래그 재정렬
  character-card.tsx    # 단일 문자 카드
  glyph-canvas.tsx      # 읽기 전용 비트맵 canvas
  pixel-editor.tsx      # 픽셀 에디터 모달
  typewriter.tsx        # 바벨 타자기
```

> `lib/`·`components/`는 루트 하위 (`lib/supp-plan/`·`lib/lineup-builder/` 패턴과 일관).

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
