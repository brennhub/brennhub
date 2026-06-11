# Tools

도구 목록 인덱스. 각 도구의 상세는 해당 폴더의 `README.md`로.

## 도구 목록

카테고리 분류는 `lib/tools-registry.ts` `category` 필드 + `lib/hub/categories.ts` 순서. 라벨은 i18n `hub.categories.*`.

### 유틸리티 (utility)
- **이메일 발송 진단기** `/tools/email-diag` — SPF/DMARC/MX/PTR 진단 + AI 요약. [상세](app/tools/email-diag/README.md)
- **Cron 변환기** `/tools/cron-trans` — cron 식 ↔ 자연어 양방향 변환. [상세](app/tools/cron-trans/README.md)
- **태그잇** `/tools/tag-it` — 오피스 문서(Word·Excel·PowerPoint)에서 핵심 키워드를 칩으로 뽑아 다듬고 문서 속성에 기록. 전부 브라우저 안. [상세](app/tools/tag-it/README.md)

### 파이낸스 (finance)
- **주식 시뮬레이터** `/tools/stock-sim` — 평단가 / 배당 / 분할매수 / 분할매도 시뮬레이션 (4 탭). [상세](app/tools/stock-sim/README.md)

### 건강 (health)
- **영양제 플래너** `/tools/supp-plan` — 약동학 기반 개인 영양제 스케줄링. [상세](app/tools/supp-plan/README.md)

### 라이프 (lifestyle)
- **사주 작명** `/tools/saju-naming` — 사주팔자 + 성명학 기반 작명. [상세](app/tools/saju-naming/README.md)
- **축구 베스트 일레븐 만들기** `/tools/lineup-builder` — 포메이션·선수 명단·등번호 시각 구성 + PNG 다운로드. [상세](app/tools/lineup-builder/README.md)
- **타로 테이블** `/tools/tarot` — 변하지 않는 공개 카드 사전으로 읽는 3장 타로 (메이저 아르카나 22장). 전부 브라우저 안. [상세](app/tools/tarot/README.md)

### 엔터테인먼트 (entertainment)
- **언어 창조기** `/tools/language-maker` — 픽셀 글리프를 그리고 입력값에 1:1 매핑해 실시간 변환·이미지 공유. [상세](app/tools/language-maker/README.md)
- **픽셀 미로 만들기** `/tools/maze` — 픽셀 격자로 미로를 설계하고 시야 제한 플레이·숏링크 공유. [상세](app/tools/maze/README.md)

## 유니버설

- **피드백 시스템** — 모든 페이지 우하단 floating 버튼 + 대시보드 카드 아이콘. 자세한 사항은 루트 [CHANGELOG.md](./CHANGELOG.md)와 [PATTERNS.md](./PATTERNS.md).
- **관리자** `/admin/feedback` — Basic Auth gated 피드백 보드.

## `[slug]` fallback — `/tools/[slug]`

- Purpose: 미공개 도구 슬러그 진입 시 "coming soon" 안내
- Files: `app/tools/[slug]/page.tsx` + `client-page.tsx`
- Registry: `lib/tools-registry.ts`
