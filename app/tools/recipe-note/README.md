# 레시피 받아쓰기 (Recipe Note) · `recipe-note`

유튜브 요리 영상을 보며 받아쓰고, 주방에서 폰으로 따라 하는 도구.

## 한 줄 정의

> **정량(300g)과 감각량(한 움큼)을 동등한 1급 데이터로 취급한다.**
> "약간"을 그램으로 추정하는 순간 이 도구는 거짓말을 시작한다.

AI 호출 0. 전 과정 결정론. 기획서 v1.0 (2026-08-14 확정)이 정본이며 본 문서가 구현 매핑이다.

## 비원칙 (하지 않는 것)

- 유튜브 자막·영상 추출 **X** — 사용자가 직접 받아쓴다. 그게 이 도구의 전부다.
- LLM 호출 **X**
- 감각량의 수치 추정 **X** — "약간"은 ×3에서도 "약간"이다.
- 단위 간 환산(큰술 → ml) **X** — 재료마다 밀도가 다르다. 모르는 것을 아는 척하지 않는다.
- 로그인 **X** — 수정 권한은 링크 + 로컬 토큰으로만.

## 핵심 흐름

```
PC에서 영상 보며 입력  →  저장 → 숏링크 발급  →  폰에서 링크 열어 열람·조리
   /tools/recipe-note         POST /api/recipe-note      /tools/recipe-note/r/[key]
```

## 화면

| 경로 | 종류 | 하는 일 |
|---|---|---|
| `/tools/recipe-note` | server → client shell | 입력 폼 + 라이브 파싱 힌트 + "내 레시피" 목록 |
| `/tools/recipe-note/r/[key]` | server(D1 직접 fetch) → client shell | 배율 환산·재료 체크리스트·순서, 조리 모드 진입 |
| `/tools/recipe-note/edit/[key]` | server(D1 직접 fetch) → client shell | 동일 폼 + 기존 데이터. editToken 보유자만 |

조리 모드는 **열람 페이지 내부 상태**다 — 라우트를 옮기지 않는다. 젖은 손으로 뒤로가기를 누르는 상황을 만들지 않기 위해서.

## 파일 구조

```
app/tools/recipe-note/
├── page.tsx                    server — metadata + 입력 셸
├── client-shell.tsx            "use client" — 저장 플로우 + 숏링크 패널 + 내 레시피
├── r/[key]/page.tsx            server — D1 fetch + noindex metadata
├── r/[key]/view-shell.tsx      "use client" — 배율·체크리스트·조리 모드 전환
├── edit/[key]/page.tsx         server — D1 fetch
├── edit/[key]/edit-shell.tsx   "use client" — PUT + 403 처리
├── components/recipe-form.tsx  입력·수정 공용 폼 (라이브 힌트 포함)
├── components/cook-mode.tsx    스텝퍼 + 타이머 + Wake Lock + 단계별 재료
├── components/recipe-not-found.tsx  조회 실패 fallback (server component)
└── poc/parse.test.ts           §4 규칙 단위 테스트 (69건)

lib/recipe-note/
├── types.ts     Ingredient · Step · Recipe · LIMITS · SCALE_STEPS
├── parse.ts     §4-1 재료 라인 · §4-3 타이머 · §4-4 단계별 재료 (순수 모듈)
├── scale.ts     §4-2 근사 분수 표기 + 배율 환산
├── key.ts       base62 키(8자) · 수정 토큰(24자) — 거부 샘플링으로 편향 제거
├── record.ts    입력 검증 + D1 row ↔ Recipe 변환 (서버·클라 공용)
├── storage.ts   "내 레시피" localStorage (schemaVersion 1)
└── db.ts        AUTH_DB 접근 — 열람·수정 page.tsx의 server fetch 경로
```

`parse.ts`·`scale.ts`·`record.ts`·`key.ts`는 **순수 모듈**이다 (window·fetch·React 참조 0).
API route(Workers)·server component·`npx tsx` 테스트가 같은 코드를 돈다.

## 파싱 규칙 요약 (기획서 §4 = 정본)

### 재료 라인 — 매칭 순서

1. `이름 수량 단위` — 띄어쓰기 형태 (`돼지고기 목살 300 g`, `대파 한 줌`)
2. `이름수량단위` — 붙여쓰기 형태 (`물500ml`). **숫자 수량만** 허용
3. `이름 수량` — 단위 없는 정량 (`계란 3`)
4. `이름 + 수량 + 사전에 없는 단위` → **양 표현 전체**를 `raw`로 (`물 500 그램` → `물` / `500 그램`)
5. 마지막 공백 분리 → `이름 / raw` (`소금 약간`)
6. 공백 없음 → 전체를 이름으로 (`대파`)

**오탐 방어**: 2단계에서 이름이 영숫자로 끝나면 해석을 포기한다. `비타민B12`의 `12`, `300g`의 `00`을 수량으로 읽는 경로가 정확히 거기다. 한글 수사(`반`·`한`·`두`…)는 단위가 따라올 때만 수량으로 본다 — `김치 반`의 `반`은 `raw`로 남는다.

**4단계가 따로 있는 이유**: 단순 마지막-공백 분리만 두면 `물 500 그램`이 `name="물 500"`이 된다. 이름에 눌어붙은 숫자는 §4-4 단계 매칭에서 `500번 젓는다` 같은 문장에 걸려 엉뚱한 단계에 재료를 붙인다.

### 기획서에서 벗어난 판단 3건

- **단위 대소문자**: `500ML`·`1KG`을 받아준다(정규형으로 흡수). 단 `T`(큰술)/`t`(작은술)는 대소문자가 의미를 가르므로 제외.
- **`0.375` 사례**: 기획서 §4-2 괄호의 `0.375 → 1/3` 예시는 수치가 맞지 않는다(1/3 = 0.333, 오차 0.042 > ±0.02). 명시된 규칙(허용오차 ±0.02, 후보 `1/4 1/3 1/2 2/3 3/4`)을 따라 `0.38`로 떨어뜨렸다. 8분모 확장은 BACKLOG.
- **정수 스냅 밴드 없음**: `0.98`을 `1`로 당기지 않는다. 기획서에 없는 반올림이고, 부동소수 찌꺼기(`2.9999…`)는 소수 2자리 반올림이 이미 흡수한다.
- **아주 작은 양은 `0`으로 적지 않는다**: 2자리 반올림이 0이 되는 값(`0.001`)은 유효숫자를 늘려 `0.001`로 쓴다. `0`은 "없다"는 뜻이고, 있는 것을 없다고 적는 건 이 도구가 하지 않기로 한 종류의 거짓말이다.
- **생성 rate limit**: 기획서는 MVP 제외로 뒀으나 구현했다. 로그인 없는 공개 write 엔드포인트를 무제한으로 열어두지 않는다 — feedback·maze·game_scores와 동일 패턴(같은 IP 30초 1회).

## 데이터 · 인프라

- **D1 binding `AUTH_DB`** — 별도 DB 미생성 정책 일관 (2026-05-27 이후 전 도구). 테이블 `recipe_note_recipes`.
- **마이그레이션**: `migrations/auth/013_recipe_note.sql`. repo에 자동 적용 장치가 없다 — **사람이 `wrangler d1 execute`를 직접 돌려야 한다** (파일 헤더에 prod/preview 명령 명시).
- **조회 API 없음** — 열람·수정 `page.tsx`가 server에서 D1을 직접 읽는다 (Server Component 우선 원칙).
- **`export const runtime` 명시 금지** — OpenNext 미지원 (BRENNHUB.md §7).

## 권한 모델 (로그인 없음)

- 생성 시 `editToken`(base62 24자 ≈ 143비트)을 발급해 **생성자 브라우저 localStorage에만** 저장한다.
- 열람 화면의 `수정` 버튼은 이 토큰 보유 여부로 노출을 결정한다 — **화면 분기용일 뿐**이다.
- 실제 권한은 `PUT`이 검증한다. 토큰 불일치 403, 없는 레시피 404. 토큰은 어떤 응답에도 실려 나가지 않는다.
- **한계(명시)**: 브라우저 데이터를 지우면 수정 권한이 사라진다. 클라우드 동기화는 BACKLOG — 지금은 이 한계를 UI 문구로 정직하게 알린다.

## i18n

UI 크롬만 ko/en (`Messages.recipeNote`, 62키). **레시피 본문은 사용자 데이터**라 번역 대상이 아니다.
열람·수정 페이지는 `noindex` — 제목이 사용자 데이터이므로 검색 노출 대상이 아니다.

## 검증

```bash
npx tsx app/tools/recipe-note/poc/parse.test.ts   # §4 규칙 80건
npm run build                                      # TS + 라우트 emit 확인
```

D1 왕복은 로컬에서 검증하지 않는다 — dev 배포 후 실제 저장/열람으로 확인 (saju-naming 선례).
