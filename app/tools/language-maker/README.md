# 언어 창조기 — `/tools/language-maker`

> UI 표시명은 "언어 창조기" (en "Language Maker"). 코드 식별자(slug `language-maker`, registry id, 파일 경로)는 불변.

사용자가 픽셀로 자신만의 문자(글리프)를 그리고, 임의의 입력값(글자·단어·감정 등)에 1:1로 매핑해 실시간으로 변환하고 이미지로 공유하는 클라이언트 사이드 도구.

## 목적

게임 세계관 제작자·디자이너·창작자가 자기만의 문자 체계나 암호를 빠르게 디자인하고, 입력 텍스트를 그 문자로 실시간 변환해 이미지로 공유할 수 있도록 한다. 백지(무지 슬롯)에서 시작해 픽셀 단위로 글리프를 그리고, 원하는 입력값에 자유롭게 매핑하는 흐름.

출처: 외부 기획서 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## V1 코어 스코프

1. **무지 슬롯(백지) 글리프 생성·관리** — 빈 슬롯에서 글리프를 추가/수정/삭제. 글자 수 제한 없음.
2. **픽셀 에디터** — 단순 드로잉 캔버스(8×8 또는 16×16). 클릭/드래그로 픽셀 토글.
3. **1:1 치환 매핑** — 글리프 ↔ 트리거 문자열(글자·단어·감정 등)을 1:1로 연결.
4. **바벨 타자기** — 입력 텍스트를 매핑된 글리프로 실시간 변환 출력 + 이미지 캡처/다운로드.

V1은 의도적으로 축소된 스코프. 스타터 팩 프리셋·랜덤 대칭 생성기는 V2 후보 (아래 "차별점·확장 계획").

## 기술 스택

| 항목 | 채택 |
|---|---|
| 프레임워크 | Next.js 16 App Router |
| 스타일 | Tailwind v4 (CSS-first) |
| 렌더 | React Client Component (`"use client"`) |
| 캡처/렌더 | canvas 네이티브 (`canvas.toDataURL`) — 외부 캡처 라이브러리 없음 |
| 영속 | localStorage (schemaVersion 마이그레이션) |
| 백엔드 | 없음 — 클라이언트 사이드 완결 |

다른 도구(stock-sim, supp-plan, lineup-builder)와 동일 스택. 별도 백엔드 운영 X.

> **캡처 방식 note** — lineup-builder는 DOM-to-image 라이브러리(html2canvas 1.4.1)가 Tailwind v4 + Lightning CSS의 `lab()/oklab/color-mix`를 파싱하지 못해 빈 PNG가 나왔고 `modern-screenshot`으로 교체했다 (lineup-builder CHANGELOG 0.5.0). 본 도구는 픽셀 글리프를 `<canvas>`로 직접 렌더하므로 CSS 파싱 단계 자체가 없어 이 문제가 구조적으로 발생하지 않는다 — `canvas.toDataURL()`로 외부 라이브러리 없이 캡처. 렌더 방식 확정은 MVP task로 위임.

## 데이터 구조 (예정)

```typescript
type Glyph = {
  id: string;            // 고유 ID
  bitmap: boolean[][];   // 픽셀 비트맵 (8×8 또는 16×16)
  trigger: string;       // 1:1 매핑 트리거 문자열 (글자·단어·감정 등)
};

type LanguageProject = {
  schemaVersion: number; // localStorage 마이그레이션용
  gridSize: 8 | 16;
  glyphs: Glyph[];
};
```

> 타입 최종 확정은 MVP task. localStorage hydrate + persist + schemaVersion 마이그레이션은 stock-sim/supp-plan 패턴 (PATTERNS.md).

## 차별점 · 확장 계획

- **차별점** — 게임 세계관 문자·암호 디자인 용도. 무지 슬롯(백지)에서 시작하는 자유 매핑 + 픽셀 단위 글리프 + 실시간 변환·공유. 정해진 알파벳이 아니라 사용자가 0부터 정의한다.
- **V2 후보** — 스타터 팩 프리셋(미리 만들어진 글리프 세트로 시작), 랜덤 대칭 생성기(대칭 패턴 자동 글리프 생성). V1 효능감 검증 후 별도 task.

## 파일 구조 (예정)

```
app/tools/language-maker/
  README.md             # 본 문서
  BACKLOG.md            # V1 MVP 작업 계획 (후속 task 단일 출처)
  CHANGELOG.md
  page.tsx              # Server Component shell (MVP task)
  client-shell.tsx      # Client wrapper (MVP task)
lib/language-maker/
  types.ts              # Glyph / LanguageProject 타입
  ...
components/language-maker/
  ...
```

> `lib/`·`components/`는 루트 하위 (`lib/supp-plan/`·`lib/lineup-builder/` 패턴과 일관). 도구 폴더 안에는 문서 3종 + page/client-shell만.

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).
