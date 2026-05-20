# saju-naming Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

## Step 1 — 사주 계산 엔진

### Task 37 — 사주팔자 계산
- [x] `lib/saju.ts` — `Pillar`, `SajuResult`, 상수 + `calculateSaju(year, month, day, hour, isLunar)`
- [x] 시주 계산 (일간 기준 `DAY_STEM_HOUR_BASE` 매핑)
- [x] 음력 ↔ 양력 변환 (`korean-lunar-calendar`)
- [x] PoC 검증 (`poc/saju-poc.test.ts`, 1979-05-29 05:00 양력 — 5/5 통과)
- [ ] 자정 경계 / 윤달 / 입춘 기준 처리 결정 (Phase 2)

### Task 38 — 오행 분석
- [x] 천간/지지 → 오행 매핑 (`CHEONGAN_OHAENG`, `JIJI_OHAENG` — saju.ts)
- [x] 8글자 → 오행 5원소 카운트
- [x] 부족(==0) / 과다(≥3) 판별
- [x] 용신/기신 결정 로직 (`lib/ohaeng.ts`, 기신 우선 충돌 정책)

## Step 2 — 데이터 인프라

### Task 39 — 한자 DB
- [x] D1 스키마 설계 + 마이그레이션 파일 (`migrations/001_hanja.sql`) — 39-A
- [x] 시드 데이터 25자 (오행별 5자, `migrations/002_hanja_seed.sql`) — 39-A
- [x] D1 binding `NAMING_DB` (wrangler.jsonc, prod + preview) — `0.4.0` (prod `2b4853be...`, preview `48fce286...`). migrations apply는 Brenn 수동 후속.
- [ ] 음 → 한자 후보 조회 API (hanja-search API로 부분 충족)
- [ ] 한자 → 의미/오행 조회

#### 39-B — 인명용 한자 풀 데이터 적재 (9,389자, 2024-06-11 대법원규칙 제3151호)

5단계: C-1~C-3 데이터/조사, C-4 도메인 결정, C-5 코드.
진행: C-1 DONE / C-4-B 확정 / C-4-A 데이터셋 방향 결정 / 다음: C-2~3 정찰.

- [x] **C-1 자수 정정** — 8,142자(인수인계 오류) → 9,389자 확정. BACKLOG/문서 반영 완료.
- [ ] **C-2 데이터 소스 정찰** (read-only) — 후보 평가:
  - rutopio gov 데이터셋 (9,444 unique / 9,389 cover) — 인명용 한자 코드포인트
  - naver 한자사전 — 의미(meaning)
  - rycont 한자 데이터 — 부수 / 획수
  - Unihan database (Unicode) — fallback 부수 / 획수 / 음
- [ ] **C-3 라이센스 + join 가능성 검증** — 각 소스 라이센스 + join key(코드포인트) 일치율:
  - rutopio: MIT 확인됨
  - rycont: 라이센스 확인 필요
  - Unihan: Unicode 라이센스 (재배포 허용)
- [ ] **C-4-A 자원오행 매핑 룰** [데이터셋 확보 — C-2/C-3 통합]
- [x] **C-4-B 원획법 변환 룰** [도메인 결정 완료]
- [ ] **C-5 5-way join + bulk insert + `migrations/003_hanja_full.sql`** [BLOCKED — C-1~4 완료 후] — 변환 스크립트 + 배치 분할 INSERT + D1 apply

##### C-4-B 원획법 변환 룰 [확정]

부수 14개 환원표 (yesname.co.kr 출처, 명리학 통용 표준):

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

적용: C-5 단계의 `stroke_count` 컬럼 계산 시 위 룰을 부수 매핑으로 적용.

##### C-4-A 자원오행 매핑 룰 [데이터셋 확보 방향 — C-2/C-3 통합]

결정: 부수 단위 통상 매핑 (옵션 i) 대신 인명용 한자 분류 데이터셋 (옵션 ii) 채택.

근거:
- 자원오행은 2단계 결정 (부수 → 오행 + 부수가 오행 아닐 경우 의미 기반). 룰 100% 자동화 어려움.
- 표준화된 단일 부수 → 오행 표 없음 (명리학 유파별 차이).
- 김기승 "자원오행 성명학" (632쪽, 대법원 인명용 한자 자원오행 분류)이 권위서.
- clien.net 등에 인명용 한자 자원오행 엑셀 공유 자료 존재. 라이센스 확인 필요.

진행 방향:
- C-2/C-3 정찰 단계에서 자원오행 분류 데이터셋 후보 식별 + 라이센스 검증.
- 초기 적재는 통용 데이터셋 사용 (정확도 ~95%).
- 향후 개선: 사용 피드백 + 김기승 책 직접 참조 등으로 분류 정정 (build-in-public).

#### 39-C — 점수 base 튜닝 (39-B 적재 후)

- [ ] `calcOhaengScore` / `calcSoundScore` base값 재검토 — 현재 base=0. 39-B 풀 데이터 적재 후 실제 점수 분포 측정 → base 재설정.
- 의존: 39-B C-5 완료 필수 (25자 시드로는 분포 측정 불가).

### Task 40 — 81수리 (수리길흉)
- [x] `lib/surie.ts` — 원형이정 (元亨利貞) 4격 계산
- [x] 81수 길흉 매핑 (1-50 테이블 + 51+ 순환 매핑 `((n-1)%50)+1`)
- [x] 외자/3자 이름 모두 지원 (`calculateSurie(sungStroke, name1, name2?)`)
- [x] 길수/흉수 점수화 (대길=25/길=20/반길=10/흉=0, totalScore 0-100)

## Step 3 — 추천 로직 + API

### Task 41 — 이름 추천
- [x] `lib/names.ts` — `recommendNames(options)`, 성씨 + 용신/기신 + nameLength → 후보 리스트
- [x] 가중 점수: 오행 40% / 81수리 35% / 발음오행 25%
- [x] 한글 초성 추출 (`getInitialConsonant`, 쌍자음 → 평음 normalize) + 발음오행 매핑
- [x] excludeChars로 iteration 지원 (마음에 안 드는 한자 제외)
- [ ] `calcOhaengScore`/`calcSoundScore` base값 재검토 → **[39-C로 이관]**
- [ ] 부모 의도 키워드 (선택) → AI 매칭 점수 (Premium)
- [ ] 후보 30개 (Basic) / 무제한 (Premium) 생성 흐름
- [ ] iteration UX: "이 후보 마음에 안 듦" → 다른 후보로

### Task 42 — API 엔드포인트
- [x] `app/api/saju-naming/saju/route.ts` — POST: 생년월일시 → 사주 + 오행 분석 (D1 의존 없음). 0.3.0 추가. 0.6.1에서 `runtime = "edge"` 제거 (OpenNext 미지원).
- [x] `app/api/saju-naming/recommend/route.ts` — POST: 성씨 + 용신/기신 → 후보 리스트 (NAMING_DB 의존). 0.5.0 추가, 0.6.1 runtime 제거.
- [x] `app/api/saju-naming/hanja-search/route.ts` — GET: 한자 검색 (NAMING_DB 의존, 페이지네이션). 0.5.0 추가, 0.6.0 경로 평탄화, 0.6.1 runtime 제거.
- [ ] Rate limit (IP 해시, 무료 티어 보호)
- [ ] Mock D1 검증 패턴 도입 (현재는 사후 curl로 happy path 검증) — 모든 API 회귀 자동화 시 한 번에 패턴 정립

## Step 4 — 웹 UI + 결제 + 출시

### Task 43 — 랜딩 페이지 (`/naming`)
- [x] 기본 골격 (Hero, 차별점, 가격, TODO 섹션) — Task 36-A
- [ ] Gemini 환각 사례 섹션
- [ ] 후기 / 사회증명
- [ ] FAQ
- [ ] OG 이미지

### Task 44 — 무료 미리보기 흐름

> 의존: 39-B 완료 = 추천 품질 정상화 = 효능감 정상 → 44 진입 준비 완료.

- [ ] 입력 폼 (생년월일시, 성별, 음/양력, 성씨)
- [ ] 사주 결과 시각화 (8글자 그리드 + 오행 차트)
- [ ] 후보 3개 표시
- [ ] "더 보려면 Basic" 결제 유도

### Task 45 — Basic / Premium 흐름
- [ ] Stripe 결제 통합
- [ ] 후보 30개 (Basic) 화면
- [ ] AI 어감 분석 (Premium)
- [ ] 부모 의도 입력 (Premium)
- [ ] iteration 버튼

### Task 46 — 결과 저장 / 공유
- [ ] D1에 결과 저장 (선택)
- [ ] PDF 또는 이미지 export
- [ ] 공유 링크

### Task 47 — i18n
- [ ] `lib/i18n/messages.ts`에 `sajuNaming.*` namespace (ko 우선, en은 후순위)

### Task 48 — MCP 선택
- [ ] 사주 계산을 외부 MCP 노출할지 결정 (B2B 가능성)

### 별도 Task: surie/names inline 블록 분리
- [x] `lib/surie.ts` + `lib/names.ts` inline `process.exit` 검증 블록을 `poc/*-poc.test.ts` 로 분리 (Edge runtime 호환성 — `/api/recommend` 진입 전 필수). `ohaeng.ts`와 동일 패턴. **완료: `0.4.1`**

### 별도 Task: ts-node → tsx 환경 통일
- [ ] poc/ 테스트 파일 실행 환경 tsx로 통일
- [ ] `package.json` scripts에 `"test:saju": "tsx app/tools/saju-naming/poc/saju-poc.test.ts"` 추가
- 배경: Node 22 ESM + ts-node 10 호환성 문제로 `npx ts-node`가 `Cannot find module` 에러. tsx는 zero-config로 통과 (Task 37/38 검증 완료).

### Task 49 — Launch
- [ ] Stripe 라이브 모드 + webhook
- [ ] 도메인 / SEO 최종 점검
- [ ] 마케팅 카피 + 첫 캠페인
