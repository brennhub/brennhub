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
- [ ] **39-B**: 대법원 인명용 한자 8,142자 풀 데이터 적재 (소스 확보 + 변환 스크립트 + bulk INSERT)
- [ ] D1 binding `NAMING_DB` (wrangler.jsonc, prod + preview)
- [ ] 음 → 한자 후보 조회 API
- [ ] 한자 → 의미/오행 조회

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
- [ ] `calcOhaengScore`/`calcSoundScore` base값 재검토 (39-B 적재 후, 현재 base=0)
- [ ] 부모 의도 키워드 (선택) → AI 매칭 점수 (Premium)
- [ ] 후보 30개 (Basic) / 무제한 (Premium) 생성 흐름
- [ ] iteration UX: "이 후보 마음에 안 듦" → 다른 후보로

### Task 42 — API 엔드포인트
- [ ] `app/api/saju-naming/saju/route.ts` — POST: 생년월일시 → 사주 + 오행 분석
- [ ] `app/api/saju-naming/candidates/route.ts` — POST: 성씨 + 사주 + 의도 → 후보 리스트
- [ ] `app/api/saju-naming/hanja/route.ts` — GET: 음 → 후보 한자 / 한자 → 정보
- [ ] Rate limit (IP 해시, 무료 티어 보호)

## Step 4 — 웹 UI + 결제 + 출시

### Task 43 — 랜딩 페이지 (`/naming`)
- [x] 기본 골격 (Hero, 차별점, 가격, TODO 섹션) — Task 36-A
- [ ] Gemini 환각 사례 섹션
- [ ] 후기 / 사회증명
- [ ] FAQ
- [ ] OG 이미지

### Task 44 — 무료 미리보기 흐름
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

### 별도 Task: ts-node → tsx 환경 통일
- [ ] poc/ 테스트 파일 실행 환경 tsx로 통일
- [ ] `package.json` scripts에 `"test:saju": "tsx app/tools/saju-naming/poc/saju-poc.test.ts"` 추가
- 배경: Node 22 ESM + ts-node 10 호환성 문제로 `npx ts-node`가 `Cannot find module` 에러. tsx는 zero-config로 통과 (Task 37/38 검증 완료).

### Task 49 — Launch
- [ ] Stripe 라이브 모드 + webhook
- [ ] 도메인 / SEO 최종 점검
- [ ] 마케팅 카피 + 첫 캠페인
