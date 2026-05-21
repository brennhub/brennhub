# C-5-8 inname_ok 정확화 — 비표준 405자 제외 (안전 부분 reconcile)

**Date**: 2026-05-21
**Task**: saju-naming Task 39-B C-5-8 (critical)
**목적**: 9,460자 전부 inname_ok=1 (C-5-2 fallback) 상태를 공식 인명용 한자와 reconcile — 비등록 한자가 추천에 섞여 출생신고 거부되는 risk 제거.

---

## 1. 정찰 — 권위 리스트 추출성

### 1순위 law.go.kr 「가족관계의 등록 등에 관한 규칙」 별표: 접근 ✅ / 텍스트 추출 ❌

- 한국 정부 사이트 인증서 문제로 WebFetch·curl 기본 호출 실패 → `curl --ssl-no-revoke`로 우회 성공 (revocation check skip).
- 규칙 제37조: **인명용 한자 = 교육용 기초한자(1,800자) + 별표1 「인명용추가한자표」**. 별표2 = 허용 자체(변형).
- law.go.kr 화면의 별표1 PDF/HWP는 **커버 페이지**일 뿐 — 본문은 별도 HWPX (`BYL/grtFile/law010569…3151KC_000100E.hwpx`, 10.8MB, 대법원규칙 제3151호).
- HWPX(zip+xml) `Contents/section0.xml` 분석:
  - `<hp:t>` 텍스트 한자 = **15자뿐** (제목 `人名用追加漢字表` 등).
  - `<hp:pic>` = **7,274개** — 별표1의 한자가 전부 65×65px BMP 이미지로 임베드.
- → **직접 텍스트 추출 불가.** 7,274 글리프 OCR 또는 폰트-렌더 이미지 매칭 필요.
- 라이센스: 별표 = 법령(대법원규칙) → 저작권 비대상 (저작권법 §7). 라이센스는 안전 — 막힌 건 형식뿐.

### 2순위 efamily / rutopio

- efamily: 인명용 한자 사실 자체는 법령(비저작물)이나 채널이 열등 — JS-gated, robots 결과 endpoint 차단, ~9,000자 PDF도 이미지 개연성. law.go.kr에 완전 열등.
- rutopio gov 데이터 = efamily 조회 도구 크롤 결과 = BrennHub 기존 9,460 그 자체. 재크롤 = 동어반복, 독립 권위 아님.

### 결론 — 원 scope 차단

무료·기계가독 권위 코드포인트 리스트 부재. 원안("권위 리스트 추출 → diff → 71자 마킹")은 진행 불가.

## 2. "9,460 vs 9,389 = 71자 초과" 정정

- 공식 9,389 = 대법원규칙 제3151호(2024.6) 명시 수치 (rutopio README 인용).
- BrennHub 9,460 실측 구성:
  - 유효 Unicode CJK **9,055** (URO 8,786 + ExtA 218 + ExtB 51) — Unihan join ✅.
  - 비표준 **405** — plane 10 (U+A0000~, Unicode 미지정) 377 + plane 15 (U+F0000~, 사설영역 SPUA-A) 28.
- "71자 초과"는 9,460−9,389 단순 차이일 뿐 의미 부정확. 실체: 표준 CJK 9,055는 오히려 공식 9,389보다 **334자 부족**, 별도로 비표준 405 보유. 405는 efamily 크롤이 희귀 한자를 PUA/내부 코드로 수집한 **코드포인트 데이터 품질 문제**로 추정.

## 3. 채택 — Option B (안전 부분 reconcile)

위험 방향은 한쪽뿐: 추천이 위험한 건 *비등록 한자를 추천*하는 경우. 표준 CJK 9,055는 efamily(공식만 수록) 크롤이라 비등록 혼입 위험 없음(오히려 부족). **유일 위험 후보 = 비표준 405** — 유효 Unicode가 아니라 가족관계등록 시스템 입력 불가.

### 알고리즘

```
비표준 판정:  codepoint ≥ 0xA0000 (655360)
              = plane 10 (미지정 377) ∪ plane 15 (SPUA-A 28) = 405
              ※ 유효 CJK 최대 = plane 3 (ExtG~I·호환보충) → 0xA0000 안전 임계
교차검증:     위 set == staged-unihan.json total_strokes=null set (C-5-3 비표준 405자)
              → 일치 확인 (불일치 시 빌드 중단)
UPDATE:       hanja SET inname_ok = 0 WHERE codepoint ≥ 655360
```

- 외부 추출·OCR·라이센스 무관 — BrennHub 데이터 자체의 검증 가능한 사실(코드포인트 범위)만으로 reconcile.
- 보수적(안전) 방향: 비표준 제외는 추천 풀만 좁힐 뿐, 비등록 한자 추천 risk를 제거.

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `scripts/build-staged-inname-ok.ts` | 405 식별 + staged-unihan 교차검증 + JSON 생성 |
| `scripts/data/staged-inname-ok-reconcile.json` | 405 codepoint list + criterion/출처 (감사 아티팩트) |
| `migrations/006_hanja_inname_ok_reconcile.sql` | `UPDATE inname_ok=0 WHERE codepoint ≥ 655360` |
| `poc/inname-ok-reconcile.poc.ts` | count·plane·교차검증·시뮬레이션 자동 검증 |

## 5. 동작 영향

- **recommend**: 변화 없음 — 이미 `stroke IS NOT NULL`로 405 비표준 제외 중. 006은 `inname_ok` 컬럼 의미를 정합(officially registerable)하게 만드는 것.
- **hanja-search**: WHERE `inname_ok = 1` 사용 → 006 후 비표준 405자가 검색 결과에서 제외 (정당 — 비등록·null-stroke 항목 정리, 검색 endpoint 개선).

## 6. 검증

- `build-staged-inname-ok.ts` — 교차검증 통과, 405 생성 (plane10 377/plane15 28).
- `poc/inname-ok-reconcile.poc.ts` — count·plane·unihan-null/codepoint 교차검증·시뮬레이션 전부 통과.
- node:sqlite dry-run (004+005+006) — total 9,460 / inname_ok=1 9,055 / inname_ok=0 405 (전부 codepoint≥0xA0000).
- `npm run build` TS 통과.
- dev apply(006)는 Brenn 수동 (본 task scope 외).

## 7. 후속 — 정밀 권위 reconcile (비critical)

별표1 BMP 7,274개를 풀커버리지 CJK 폰트 렌더와 픽셀 매칭 → 코드포인트 복원, 교육용 기초한자 1,800자(텍스트 리스트)와 합집합 = 권위 셋. BrennHub 9,460과 정밀 diff. ~1.5~2d 추정 별도 task. Option B의 안전 제외가 적용된 상태라 44 UI live 비차단 → critical 아님. BACKLOG 39-C 영역 등록.
