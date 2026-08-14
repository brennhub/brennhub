# 레시피 받아쓰기 — CHANGELOG

## 0.1.0 — 2026-08-14 (dev)

기획서 v1.0 전 범위 초기 구현. Task 1~5를 한 번에.

### 추가

- **입력 화면** `/tools/recipe-note` — 제목·영상 주소·채널 + 재료 한 줄 자유 입력(엔터 = 추가) + 순서 textarea.
  - 라이브 파싱 힌트 1줄 — 정량/감각량/이름만 3분기.
  - 재료 목록: 이름(좌) / 양(우) / 삭제. **정량·감각량 동일 스타일, 배지·경고 없음.**
  - 저장 시 입력창에 남아 있는 한 줄도 함께 저장 ("추가를 안 눌러서 날아갔다" 방지).
  - 하단 "내 레시피" — localStorage `{key, title, editToken}` 목록.
- **열람 화면** `/tools/recipe-note/r/[key]` — server D1 직접 fetch.
  - 배율 세그먼트 ×0.5·×1·×1.5·×2·×3. 환산된 양은 색으로 구분, 배율 ≠ 1일 때만 안내 1줄.
  - 재료 체크리스트(탭 → 취소선) + 순서 번호 목록.
- **조리 모드** — 열람 페이지 내부 상태(라우트 이동 X). `n/N` 진행 표기 + 진행 바 + 큰 본문.
  - 단계 타이머(시작·일시정지·되감기), Wake Lock(미지원 브라우저는 조용히 무시, 탭 복귀 시 재획득).
  - "이 단계 재료" 하단 1줄 — 배율 반영된 양으로.
- **수정 화면** `/tools/recipe-note/edit/[key]` — 입력과 동일 폼 + 기존 데이터. `PUT` + `x-edit-token`.
- **API** `POST /api/recipe-note`(생성) · `PUT /api/recipe-note/[key]`(수정). 조회 API는 없다.
- **파서** `lib/recipe-note/parse.ts` + `scale.ts` — 기획서 §4 전 규칙. 단위 테스트 69건 통과.

### 결정 · 기획서에서 벗어난 판단

- **`/r/[key]` 경로 채택** — repo의 유일한 숏링크 선례(maze)는 `?id=` 쿼리 파라미터지만 기획서가 경로형을 명시했다. 3-세그먼트라 `[slug]` fallback과 충돌하지 않는다.
- **base62 8자 / 토큰 24자** — 기획서대로. maze의 base36 6자와 다르다(용도가 다르다 — 토큰은 사실상 인증 수단이라 거부 샘플링으로 modulo 편향까지 제거).
- **`AUTH_DB` 사용** — 기획서는 binding을 명시하지 않았다. 별도 DB 미생성 정책(2026-05-27 이후 전 도구)에 맞춰 `AUTH_DB` 도메인 확장.
- **생성 rate limit 구현** — 기획서는 MVP 제외(BACKLOG 등재)였으나, 로그인 없는 공개 write 엔드포인트를 무제한으로 열지 않는다는 repo 관례를 따랐다. 같은 IP 30초 1회.
- **단위 대소문자 흡수** — `500ML`·`1KG`을 정규형으로 받아준다. `T`(큰술)/`t`(작은술)는 대소문자가 의미를 가르므로 제외.
- **`0.375` 표기** — 기획서 §4-2 괄호 예시(`0.375 → 1/3`)는 수치가 어긋난다(오차 0.042 > 명시된 ±0.02). 명시된 규칙을 따라 `0.38`. 8분모 확장은 BACKLOG.
- **열람·수정 페이지 `noindex`** — 레시피 제목은 사용자 데이터라 검색 노출 대상이 아니다.

### 리뷰 반영 (초기 구현 직후 자체 점검)

- **`formatQty`가 있는 양을 `0`으로 적던 문제** — 2자리 반올림이 0이 되는 작은 값(`0.001`)을 `0`으로 표기했다. 0은 "없다"는 뜻이라 실질적 거짓말. 유효숫자를 늘려 표기하도록 수정.
- **정수 스냅 밴드 제거** — `0.98`을 `1`로 당기던 로직은 기획서에 없는 반올림이었다. 삭제.
- **사전에 없는 단위의 fallback** — `물 500 그램`이 `name="물 500"`으로 떨어져 이름에 숫자가 눌어붙었고, 그 이름이 §4-4 단계 매칭에서 `500번 젓는다`에 걸렸다. 양 표현 전체를 `raw`로 떼어내도록 수정.
- **조리 타이머를 마감 시각 기준으로 재작성** — 남은 초를 1씩 빼는 방식은 매 틱 렌더 지연만큼 밀리고, 탭이 백그라운드로 가면 브라우저의 interval 조이기로 크게 어긋났다. 요리 타이머는 정확해야 한다.
- **저장 후 막다른 길 제거** — 링크 화면에서 빈 폼으로 돌아갈 수단이 없었다. [새 레시피 쓰기] 추가.
- **오류 문구 분리** — 41단계를 적은 사용자에게 "순서를 하나 이상 적어주세요"라고 답하던 매핑을 고쳤다. 개수 초과·길이 초과·미입력을 각각 다른 문구로.
- **읽을 때도 영상 주소 재검증** — `href`로 나가는 값이라 저장 경로와 무관하게 렌더 직전에 http(s)를 한 번 더 확인한다.
- **모델 불변식 강제** — 조작된 요청이 `qtyText`에 임의 문자열을 넣거나 `qty`와 `raw`를 동시에 채우는 것을 서버에서 차단. `timerSec`도 파서와 같은 24시간 상한 적용.
- **`edit_token` 조회 헬퍼 삭제** — 쓰지 않는 코드였고, server component가 쓸 수 있는 자리에 토큰 조회 경로를 남겨두지 않는다.

### 인프라

- `migrations/auth/013_recipe_note.sql` — `recipe_note_recipes` 테이블 + 유니크 키 인덱스 + rate-limit 인덱스.
  - 기획서 SQL의 `key TEXT NOT NULL UNIQUE` + 별도 `CREATE UNIQUE INDEX`는 같은 인덱스를 두 벌 만든다. 제약은 인덱스 하나로 걸고 기획서의 인덱스 이름을 유지했다.

#### D1 적용 (사람이 직접 실행 — 자동화 없음)

이 repo에는 마이그레이션 자동 적용 장치가 없다(`wrangler.jsonc`에 `migrations_dir` 미설정, npm script 없음, CI 미터치).
**아래를 실행하기 전까지 dev/prod에서 저장·열람이 동작하지 않는다.**

```bash
# preview (dev.brennhub.com)
wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/013_recipe_note.sql

# prod (brennhub.com) — main 머지 시점에
wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/013_recipe_note.sql
```

⚠️ `--env preview`로는 DB가 바뀌지 않는다 — **DB 이름이 첫 위치 인자**다 (`migrations/auth/001~006` 헤더 경고 일관).

### 검증

- `npx tsx app/tools/recipe-note/poc/parse.test.ts` — 69/69 통과.
- `npm run build` — 라우트 emit 확인 (`/tools/recipe-note`, `/tools/recipe-note/r/[key]`, `/tools/recipe-note/edit/[key]`).
- D1 왕복은 dev 배포 + 마이그레이션 적용 후 실제 저장/열람으로 확인.
