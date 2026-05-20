# saju-naming Task 39-B C-5-1 — D1 스키마 정찰 보고서

**Date**: 2026-05-19
**목적**: C-5-1 (D1 스키마 설계) — ALTER 확장 vs 신 테이블 결정 + `migrations/003` SQL 초안을 위한 사실 데이터 수집.
**범위**: read-only. 코드/스키마 변경 없음. 코드 인용은 verbatim.

---

## 1. migrations 폴더

`ls app/tools/saju-naming/migrations/`:

```
001_hanja.sql
002_hanja_seed.sql
```

### 001_hanja.sql (전문)

```sql
-- 사주 작명: 한자 풀 (Cloudflare D1).
-- binding: NAMING_DB (예정).

CREATE TABLE IF NOT EXISTS hanja (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  character   TEXT NOT NULL UNIQUE,             -- 한자 (예: 美)
  hangeul     TEXT NOT NULL,                    -- 한글 음 (예: 미)
  stroke      INTEGER NOT NULL,                 -- 획수 (원획법 기준)
  ohaeng      TEXT NOT NULL,                    -- 오행: 목|화|토|금|수
  meaning     TEXT NOT NULL,                    -- 뜻 (예: 아름다울)
  inname_ok   INTEGER NOT NULL DEFAULT 1,       -- 인명용 여부 (1=가능)
  frequency   INTEGER NOT NULL DEFAULT 3        -- 사용 빈도 1~5 (5=많이 씀)
);

CREATE INDEX IF NOT EXISTS idx_hanja_ohaeng  ON hanja(ohaeng);
CREATE INDEX IF NOT EXISTS idx_hanja_stroke  ON hanja(stroke);
CREATE INDEX IF NOT EXISTS idx_hanja_hangeul ON hanja(hangeul);
```

제약 강조:
- **PK**: `id INTEGER PRIMARY KEY AUTOINCREMENT`
- **UNIQUE**: `character` (`TEXT NOT NULL UNIQUE`)
- **NOT NULL (DEFAULT 없음)**: `character`, `hangeul`, `stroke`, `ohaeng`, `meaning`
- **NOT NULL + DEFAULT**: `inname_ok` (DEFAULT 1), `frequency` (DEFAULT 3)
- **INDEX 3개**: `idx_hanja_ohaeng`(ohaeng), `idx_hanja_stroke`(stroke), `idx_hanja_hangeul`(hangeul)

### 002_hanja_seed.sql (헤더 + 시드 샘플)

헤더 주석 (verbatim):

```sql
-- 사주 작명: 한자 시드 (오행별 5자, 총 25자).
-- 획수는 원획법(原劃法) 기준 — 부수 본래 획수 (氵=水 4획, 艹=艸 6획).
-- 인명용 여부는 대법원 인명용 한자표 기준 (Task 39-B에서 전체 8,142자 적재 예정).
```

> ⚠️ 헤더 주석의 "8,142자"는 stale (현재 확정값 9,389). C-5-6에서 003 생성 시 정정 대상.

INSERT 절 (verbatim, 처음 3 row + 마지막 row):

```sql
INSERT OR IGNORE INTO hanja (character, hangeul, stroke, ohaeng, meaning, inname_ok, frequency) VALUES
-- 목(木): 나무·성장·봄
('林', '림', 8,  '목', '수풀',          1, 5),
('森', '삼', 12, '목', '빽빽할/숲',     1, 4),
('樹', '수', 16, '목', '나무',          1, 4),
...
('潤', '윤', 16, '수', '윤택할',        1, 5);
```

- 총 25 row, `INSERT OR IGNORE` 사용.
- `id` 컬럼은 INSERT 절에 없음 (AUTOINCREMENT).
- **모든 row가 비어있지 않은 `meaning` 문자열 보유**. NULL / "" 사례 0건.

---

## 2. API 컬럼 의존 (3개 route.ts)

### app/api/saju-naming/saju/route.ts

- **D1 사용**: 없음. `import` 구문 verbatim:
  ```ts
  import { calculateSaju, type SajuResult } from "@/app/tools/saju-naming/lib/saju";
  import { analyzeOhaeng } from "@/app/tools/saju-naming/lib/ohaeng";
  ```
- `getCloudflareContext` / `NAMING_DB` 미사용. 순수 계산 endpoint.
- SELECT 컬럼: 없음. WHERE 컬럼: 없음.

### app/api/saju-naming/recommend/route.ts

- **D1 사용**: `getCloudflareContext()` → `NAMING_DB`. 코드 verbatim:
  ```ts
  const { env } = getCloudflareContext();
  const db = (env as unknown as { NAMING_DB?: D1Database }).NAMING_DB;
  ```
- **SELECT (verbatim)**:
  ```ts
  "SELECT character, hangeul, stroke, ohaeng, meaning, frequency FROM hanja WHERE inname_ok = 1"
  ```
- SELECT 컬럼: `character, hangeul, stroke, ohaeng, meaning, frequency`
- WHERE 컬럼: `inname_ok` (= 1 고정)
- D1 row 타입 (verbatim):
  ```ts
  type HanjaRow = {
    character: string;
    hangeul: string;
    stroke: number;
    ohaeng: string;
    meaning: string;
    frequency: number;
  };
  ```
- client 노출: `recommendNames()` 결과 `{ candidates: NameCandidate[] }`. row는 `rowToHanjaEntry`로 `HanjaEntry`(character/hangeul/stroke/ohaeng/meaning/frequency) 변환 후 알고리즘 입력.

### app/api/saju-naming/hanja-search/route.ts

- **D1 사용**: `getCloudflareContext()` → `NAMING_DB`. recommend와 동일 패턴.
- **SQL (verbatim)**:
  ```ts
  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countSql = `SELECT COUNT(*) AS n FROM hanja ${whereClause}`;
  const selectSql = `SELECT character, hangeul, stroke, ohaeng, meaning, frequency FROM hanja ${whereClause} ORDER BY frequency DESC, stroke ASC, character LIMIT ? OFFSET ?`;
  ```
- SELECT 컬럼: `character, hangeul, stroke, ohaeng, meaning, frequency` (+ `COUNT(*)`)
- WHERE 컬럼 (동적, verbatim):
  ```ts
  const conditions: string[] = ["inname_ok = 1"];
  ...
  if (validated.hangeul) { conditions.push("hangeul = ?"); ... }
  if (validated.ohaeng) { conditions.push("ohaeng = ?"); ... }
  if (validated.strokeMin !== undefined) { conditions.push("stroke >= ?"); ... }
  if (validated.strokeMax !== undefined) { conditions.push("stroke <= ?"); ... }
  ```
  → WHERE 가능 컬럼: `inname_ok`(항상), `hangeul`, `ohaeng`, `stroke`
- ORDER BY 컬럼: `frequency DESC, stroke ASC, character`
- client 노출: `{ results: HanjaEntry[], total: number }`

### API 컬럼 의존 종합

| 컬럼 | recommend | hanja-search | saju |
|---|---|---|---|
| `character` | SELECT | SELECT, ORDER BY | — |
| `hangeul` | SELECT | SELECT, WHERE | — |
| `stroke` | SELECT | SELECT, WHERE, ORDER BY | — |
| `ohaeng` | SELECT | SELECT, WHERE | — |
| `meaning` | SELECT | SELECT | — |
| `frequency` | SELECT | SELECT, ORDER BY | — |
| `inname_ok` | WHERE | WHERE | — |
| `id` | 미사용 | 미사용 | 미사용 |

→ API가 의존하는 컬럼: **`character, hangeul, stroke, ohaeng, meaning, frequency, inname_ok` 7개**. `id`는 어떤 route도 사용 안 함. saju route는 D1 자체를 안 씀.

---

## 3. BACKLOG C-5 섹션 (전문 verbatim)

```md
##### C-5 — 5-way join + 적재 (7단계 분해)

임계 경로: C-5-1 → C-5-2 → C-5-6 → C-5-7. C-5-3 / C-5-4는 C-5-1과 독립 (병렬 가능).

| 단계 | 내용 | 의존 | 추정 | 주의점 |
|---|---|---|---|---|
| **C-5-1** | D1 스키마 설계 — 컬럼: character/codepoint/hangeul/consonant/meaning_ko/meaning_en/radical/stroke_count/won_stroke/ja_ohaeng/is_recommendable | — | 0.5d | 기존 `001_hanja.sql` 스키마(character,hangeul,stroke,ohaeng,meaning,frequency,inname_ok)와 충돌 점검. `hanja-search`/`recommend` route.ts가 읽는 컬럼 깨지지 않게. **ALTER 확장 방향 권장** (join 단순 + 25자 시드 새 컬럼 채움 + 기존 API default 처리 + migration 단계·유지보수 부담 ↓). C-5-1 코드 정찰 시 최종 결정 |
| **C-5-2** | rutopio gov+naver 적재 스크립트 — CSV 파싱 + 코드포인트 정규화 + join. 9,443↔9,389 reconcile | C-5-1 | 0.5d | 한 한자에 음 복수 (가/나 두음 등) → hangeul 다중값 처리 정책 |
| **C-5-3** | Unihan 추출 스크립트 — 부수(`kRSUnicode`)/획수(`kTotalStrokes`)/영어정의(`kDefinition`). UAX #38 탭 파싱 | — (병렬) | 0.5d | Unihan 8.5MB — repo 미포함, 스크립트가 다운로드 or 캐시 |
| **C-5-4** | 214부수×5행 자원오행 매핑표 자체 구축 — web_search 정찰 + 작명소 통용 매핑 정리 + 출처 docstring | — (병렬) | 1d | 학파 차이 → 표준안 1개 확정. C-4-A 결정 사항 |
| **C-5-5** | 원획법(C-4-B) 코드화 — `lib/saju-naming/won-stroke.ts`. 14부수 환원표 + 숫자 한자 룰 | C-5-3 | 0.5d | C-4-B 확정표 그대로. PoC 검증 |
| **C-5-6** | `migrations/003_hanja_full.sql` 생성 — 5-way join 결과 bulk INSERT, 배치 분할 | C-5-1~5 | 0.5d | D1 제약: statement 크기 / 변수 수 한도 → 배치 (~수백 row/INSERT) |
| **C-5-7** | dev 적재 + 검증 — `wrangler d1 execute`, COUNT 9,443, spot-check, hanja-search/recommend API 회귀 | C-5-6 | 0.5d | Brenn 수동 apply 가능성. 적재 후 39-C(점수 base) 진입 가능 |
```

C-4-B 원획법 확정표 (C-5-5 / C-5-6 입력, BACKLOG verbatim):

```md
| 부수 | 필획 | 원획 | 원형 |
|------|------|------|------|
| 忄 심방변 | 3 | 4 | 心 |
| 氵 삼수변 | 3 | 4 | 水 |
| 扌 재방변 | 3 | 4 | 手 |
| 犭 개사슴록 | 3 | 4 | 犬 |
| 王 구슬옥변 | 4 | 5 | 玉 |
| 礻 보일시변 | 4 | 5 | 示 |
| 月 육달월 | 4 | 6 | 肉 |
| 耂 늙을로엄 | 4 | 6 | 老 |
| 衤 옷의변 | 5 | 6 | 衣 |
| 艹 초두머리 | 4 | 6 | 艸 |
| 罒 그물망 | 5 | 6 | 网 |
| 辶 책받침 | 4 | 7 | 辵 |
| 阝 좌부방(언덕부) | 3 | 7 | 阜 |
| 阝 우부방(고을읍) | 3 | 8 | 邑 |

숫자 한자: 의미값 환원 — 一=1, 二=2, 三=3, 四=4, 五=5, 六=6, 七=7, 八=8, 九=9, 十=10. 百=6, 千=3, 萬=15.
```

D안 적재 정책 (BACKLOG verbatim):

```md
- 9,443자 (공식 9,389) **전부 D1 적재** — 데이터 보존.
- 추천 알고리즘은 **의미 보유 8,557자** (한국어 7,945 + 영어전용 612)만 사용 — `is_recommendable=1`.
- 886 의미 전무 벽자: 적재하되 `is_recommendable=0` → 추천 후보 제외.
```

---

## 4. CHANGELOG 최근 entry (0.6.5 ~ 0.5.0, 제목 + 핵심 verbatim)

- **[0.6.5]** Decided (C-2/C-3 정찰 매듭 + D안 채택) — 데이터 소스 확정(rutopio gov/naver MIT + Unihan), cover율 실측 정정, Part 1 분석, D안 채택, C-4-A 방향 전환, C-5 7단계 분해. 코드 변경 없음.
- **[0.6.4]** Decided (C-4 도메인 결정 매듭 시작) — C-4-B 원획법 14부수 환원표 확정, C-4-A 자원오행 방향 결정. 코드 변경 없음.
- **[0.6.3]** Changed (BACKLOG 재정의) — Task 39-B 5단계 분해, 도메인 결정 서브섹션, 39-C 분리, 44 의존성. 코드 변경 없음.
- **[0.6.2]** Reverted (진단 매듭) — `package.json` build `next build --webpack` → `next build` (Turbopack 복귀).
- **[0.6.1]** Fixed (진짜 진짜 root cause) — 3개 saju-naming route에서 `export const runtime = "edge";` 제거. OpenNext + Cloudflare adapter 미지원.
- **[0.6.0]** Fixed (진짜 root cause) — `app/api/saju-naming/hanja/search/route.ts` → `.../hanja-search/route.ts` 경로 평탄화.
- **[0.5.4]** Changed (진단용 임시) — `package.json` build `next build` → `next build --webpack` (Turbopack OFF 진단).
- **[0.5.3]** Fixed — vendor `korean-lunar-calendar.js` default export → named export. import 측도 named로.
- **[0.5.2]** Fixed — `korean-lunar-calendar` vendoring (`app/tools/saju-naming/lib/vendor/`). `package.json` dependencies에서 패키지 제거.
- **[0.5.1]** Fixed — `lib/saju.ts` default import → namespace import + 안전 unwrap.
- **[0.5.0]** Added — `recommend/route.ts` + `hanja/search/route.ts` 첫 D1 사용 API 추가. **NAMING_DB binding `0.4.0` 등록 + 시드 25자 적용 전제** (verbatim Note: "두 endpoint 모두 saju-naming의 **첫 D1 사용 API**. NAMING_DB binding `0.4.0`에서 등록 + 시드 25자 적용 (Phase 3 완료) 전제.").

---

## 5. 데이터 정책 — 의미 컬럼 NULL vs ""

확정 사실:
- **DDL**: `meaning TEXT NOT NULL` — NULL 불가, DEFAULT 없음.
- **시드 (002)**: 25 row 전부 비어있지 않은 `meaning` 문자열. `""` / NULL 사례 0건.
- 즉 현 정책: **모든 hanja row는 비어있지 않은 meaning 보유** (NULL도 "" 도 없음).

라이브 D1 row 샘플 — **수집 실패** (정책은 위 DDL+시드로 확정 가능):
- prod (`brennhub-saju-naming`, `--remote`): Cloudflare API 인증 실패 (`code 7403`, "account is not valid or is not authorized"). 본 환경에 prod 토큰 없음.
- local (`--local`): `no such table: hanja: SQLITE_ERROR` — 로컬 D1에 migration 미적용.
- → migration 001/002의 prod/dev apply는 Brenn 수동 후속 (CHANGELOG 0.4.0 Note 참조).

> ⚠️ **C-5-1 핵심 충돌**: D안은 886자가 의미 전무 (한국어·영어 모두 없음). 현 스키마 `meaning TEXT NOT NULL`을 그대로 두면 886 row는 `""`(빈 문자열)로만 삽입 가능. NULL 허용하려면 `NOT NULL` 제약 제거 필요. ALTER vs 신 테이블 결정 시 이 제약이 핵심 변수 — D1(SQLite)은 `ALTER TABLE ... ALTER COLUMN`/제약 변경을 지원하지 않으므로, 기존 `meaning NOT NULL`을 NULL 허용으로 바꾸려면 테이블 재생성(create-copy-drop-rename)이 불가피.

---

## 6. wrangler.jsonc — NAMING_DB binding

top-level `d1_databases` (verbatim):

```jsonc
{
  "binding": "NAMING_DB",
  "database_name": "brennhub-saju-naming",
  "database_id": "2b4853be-def4-4b94-a872-81a20d448024"
}
```

`env.preview.d1_databases` (verbatim):

```jsonc
{
  "binding": "NAMING_DB",
  "database_name": "brennhub-saju-naming-dev",
  "database_id": "48fce286-18e8-4664-826e-e1517d8a182f"
}
```

- 동일 binding 이름 `NAMING_DB`, 환경별 `database_name`(`-dev` 접미사) / `database_id` 분리.
- `env.preview`는 top-level 상속 안 함 — 전체 binding 명시 (DB / SUPP_DB / NAMING_DB 3개).

---

## 정찰 요약 (C-5-1 결정 입력)

1. **API는 `id` 미사용** — 7개 컬럼(`character/hangeul/stroke/ohaeng/meaning/frequency/inname_ok`)만 의존. 신 테이블로 가도 이 7개만 보존하면 API 무중단.
2. **`meaning TEXT NOT NULL`이 D안과 충돌** — 886 의미 전무 row. "" 삽입으로 ALTER 유지 가능하나, NULL 의미론을 원하면 테이블 재생성 필요 (SQLite는 제약 변경 미지원).
3. **신규 컬럼 6개** (codepoint/consonant/meaning_en/radical/won_stroke/ja_ohaeng) + 기존 `meaning`→`meaning_ko` 리네이밍 검토 → ALTER ADD COLUMN로 가능하나 컬럼 리네이밍/제약완화는 ALTER 불가.
4. **기존 데이터는 25자 시드뿐** — 재생성 시 손실 비용 거의 0 (003에서 9,443자 전량 재적재).
5. migration apply는 Brenn 수동. prod/dev 각각 `wrangler d1 execute ... --remote`.
