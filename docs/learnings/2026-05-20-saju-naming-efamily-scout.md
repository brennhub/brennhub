# C-5-2 (α) 1차 데이터 소스 quick check

**Date**: 2026-05-20
**목적**: 공식 9,389 인명용 한자 권위 리스트를 quick check 범위(시간 박스 1h)에서 확보 가능한지 판단 → C-5-2 (α) 1차 채택 여부 + 추정 변동 결정.
**범위**: read-only 외부 정찰. 코드/migration 변경 없음.
**배경**: C-5-2 정찰(robust 파싱)에서 rutopio gov 고유 9,460 ↔ 공식 9,389 → **71자 초과** 확인. gov CSV에 "공식 인명용" 플래그 컬럼 없어 데이터 단독 reconcile 불가 → 권위 리스트(efamily) 별도 확보 필요.

---

## 1. data.go.kr 검색 (우선)

- 검색 키워드: `인명용 한자 공공데이터 데이터셋` / `대법원 인명용 한자 9389 가족관계등록예규` / `인명용 한자 데이터셋 fileData openData` (data.go.kr 도메인 한정)
- **결과: 미발견**
- data.go.kr 포털에 "인명용 한자" 주제 데이터셋·OpenAPI 노출 0건. 검색 결과는 포털 홈/이용가이드 + 무관 데이터셋(입학정원·의약품현황 등)뿐.
- 포털 내부 검색 페이지(`/tcs/dss/selectDataSetList.do?keyword=인명용 한자`) 정적 fetch 시도 → **소켓 종료** (JS 렌더 기반, 정적 추출 불가).
- 판단: 대법원 인명용 한자는 data.go.kr 개방 데이터셋으로 제공되지 않음. (인명용 한자는 대법원규칙/예규 별표 사항이라 행정부 공공데이터 개방 채널과 별개.)
- 소요: ~10m

## 2. efamily.scourt.go.kr 직접 (차선)

권위 소스 = 대한민국 법원 전자가족관계등록시스템. **인명용 한자의 1차 권위 출처가 맞음.** 그러나 bulk 기계 접근이 막힘.

- 진입 URL: `https://efamily.scourt.go.kr/cs/CsBltnWrtList.do?bltnbordId=0000010` (고객센터 › 인명용 한자 조회)
- **(a) 형식**:
  - 조회 페이지 = **JS 기반 검색 폼** — "한글음" 입력 필드 + "조회" 버튼. 결과는 "선택한 한자 정보" 영역에 동적 렌더. **정적 HTML 테이블 없음** (사전 렌더 데이터 0).
  - 별도 "**인명용한자표 PDF파일(다운로드)**" 링크 존재 → 공식 PDF 형태 bulk 산출물.
- **(b) 컬럼/필드**:
  - 조회 도구: 입력 `한글음`, 출력 `선택한 한자 정보`(한자 상세). 정적 컬럼 헤더 노출 없음 (테이블 미렌더).
  - 안내 문구 verbatim: `"한자는 지정된 발음으로만 사용할 수 있습니다"` → 데이터 구조는 〈한자 ↔ 허용 한글음〉 매핑 중심.
  - PDF 내부 컬럼 = **미확인** (다운로드 URL 비노출로 직접 검증 불가).
- **(c) 접근 가능성**:
  - robots.txt verbatim:
    ```
    User-agent: *
    Disallow: /
    Allow: /index.jsp
    Allow: /cs/CsBltnWrtList.do
    Allow: /cs/CsBltnWrtGuide.do
    Allow: /sm/ovs/
    ```
  - 조회 **페이지**(`/cs/CsBltnWrtList.do`)는 robots Allow. 그러나 **검색 결과 endpoint·파일 다운로드 endpoint는 Allow 목록 밖** → robots-disallowed.
  - 결과 로딩 = JS/폼 제출 필수. PDF 다운로드 링크 = JS popup 함수 내부 → 정적 URL 미노출.
  - `/cs/CsBltnWrtGuide.do` 무인자 호출 → HTTP 404 (guideCd 등 파라미터 필요).
  - 인증: 조회 자체엔 불필요해 보이나 결과 endpoint에 세션 토큰 의존 가능성. rate limit 미확인.
- **(d) 라이센스**: 푸터 verbatim — `"Copyright©Supreme Court of Korea. All Rights reserved."` **KOGL / 공공누리 / CC 표시 없음.** 명시적 all-rights-reserved.
- 판단: 권위는 확실하나 quick check 범위에서 **정적 확보 불가**. bulk 취득 경로는 (i) PDF(JS-gated + 라이센스 제약 + 추출성 미확인), (ii) 조회 도구를 485개 한글음 순회 스크립팅(robots 미허용 endpoint + JS/세션).
- 소요: ~13m

## 3. github + 위키문헌 fallback

- **github**: 키워드 `인명용 한자 9389 list CSV JSON` 검색 1위 = `rutopio/Korean-Name-Hanja-Charset` — **이미 프로젝트가 쓰는 그 repo** (gov+naver crawl, 9,460 discrepancy의 출처 자체). 독립 권위 리스트 아님. 그 외 공식 9,389 리스트를 담은 별도 권위 repo 미발견.
- **위키문헌 (ko.wikisource.org)**: `가족관계등록예규 인명용 한자 별표` 검색 → wikisource 항목 **0건**. 위키문헌에 해당 별표 자료 없음.
- **추가 후보 (검색 중 노출)**:
  - `help.scourt.go.kr/nm/images/hanja/hanja.pdf` — 대법원 도메인 직접 PDF URL(별표1·별표2). fetch 시 **ECONNREFUSED** (서버 거부). 검색 노출 제목에 `"2007.8.현재"` 포함 → 2024 개정 이전 **구버전 추정**. 비채택.
  - `knaming.org/07_1.html` (한국작명교육협회) — 최신 갱신 `"2018년 12월 28일 137자 추가"`, **8,142자** 구버전. 9,389 미반영. efamily로 재안내. 라이센스 `"Copyright © 2021 한국작명교육협회 All Rights Reserved."`
  - `namu.wiki/w/한자/인명용 한자표` — 인명용 한자표 항목 존재하나 fetch 시 **HTTP 403 Forbidden** (스크래퍼 차단). namu wiki 라이센스 = CC BY-NC-SA → **NC(비상업)** 조항이 상업 작명 도구 적재에 부적합. 위키 = 권위성도 불충분.
  - `law.go.kr` 「가족관계의 등록 등에 관한 규칙」(lsiSeq 105591) — fetch 시 **소켓 종료** (스크래퍼 차단). 인명용 한자 목록은 규칙 제37조 별표1/별표2 별첨(통상 HWP/PDF). **법령·별표는 저작권 비대상**(저작권법 §7)이라 라이센스 측면 안전하나, WebFetch 차단 + 별표가 이미지/HWP 가능성으로 quick check 범위 내 추출 미확인.
- 소요: ~14m

## 종합 판단

- **선정 소스: 모두 실패** — quick check 범위(정적 fetch)에서 채택 가능한 권위 9,389 리스트 **없음**.
  - efamily = 1차 권위 출처가 맞으나 JS-gated + robots 미허용 endpoint + "All Rights reserved".
  - github/위키문헌 = 독립 권위 소스 부재 (rutopio는 기존 crawl 그 자체).
  - law.go.kr 별표 = 라이센스는 안전(법령)하나 접근 차단 + 추출성 미확인.
- **(α) 1차 시도 가능성: 낮음**
- **추정 추가 시간**: (α)를 본격 시도 시 — efamily PDF 파싱(추출성 불확실, 이미지 PDF 위험) 또는 조회 도구 485개 한글음 순회 스크립팅(robots/세션/JS) = **~0.5d~1d (4~8h)**. C-5-2에 끼우면 C-5-2가 0.5d → 1d~1.5d로 팽창.
- **권장 진행: fallback 채택.**
  - C-5-2 추정 **0.5d 유지** — (α)를 무리하게 끼우지 않음. C-5-2는 9,460 전량 적재(D안 "전량 적재" 정신, `inname_ok` 일괄 기본값) + 71자 초과는 미구분 보존.
  - 공식 9,389 권위 reconcile은 **C-5-8 (critical) 별도 task가 전담** — prompt 1에서 이미 신설. C-5-8 진입 시 efamily 조회 도구 스크립팅 또는 PDF 파싱(or law.go.kr 별표 HWP)을 본격 수행 → 71자 초과분 특정 → `inname_ok` 정확화 UPDATE.
  - 근거: quick check의 목적(저비용 분기 판정)에 부합. C-5-8은 "44 UI live 출시 전 필수"로 이미 critical 등록 → 권위 작업의 자연스러운 귀착지.

## 시간 박스 사용 내역

- 단계 1 (data.go.kr): ~10m
- 단계 2 (efamily): ~13m
- 단계 3 (github + 위키문헌 + 추가 후보): ~14m
- **총 소요: ~37m / 60m**
- 박스 초과 여부: **아니오**

## 자문 thread 입력 요약

1. **공식 9,389 권위 리스트는 quick check로 확보 불가** — efamily가 유일 권위 출처지만 JS-gated + "All Rights reserved" + robots 결과 endpoint 미허용.
2. **C-5-2는 fallback으로 진행** — 9,460 전량 적재, 71자 초과 미구분 보존, 추정 0.5d 유지.
3. **71자 reconcile = C-5-8 (critical) 전담** — efamily PDF/조회 스크립팅 또는 law.go.kr 별표(법령=라이센스 안전)를 0.5d~1d 별도 task로. 44 UI live 출시 전 필수.
4. C-5-8 착수 시 우선순위: (a) law.go.kr 「가족관계의 등록 등에 관한 규칙」 제37조 별표1/별표2 — 법령이라 라이센스 안전, 단 HWP/이미지 추출성 선확인 / (b) efamily 인명용한자표 PDF — 현행이나 라이센스 제약 / (c) efamily 조회 도구 485 한글음 순회 — 최후수단.
