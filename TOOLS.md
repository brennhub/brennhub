# Tools

도구 목록 인덱스. 각 도구의 상세는 해당 폴더의 `README.md`로.

## 도구 목록

- **이메일 발송 진단기** `/tools/email-diag` — SPF/DMARC/MX/PTR 진단 + AI 요약. [상세](app/tools/email-diag/README.md)
- **Cron 변환기** `/tools/cron-trans` — cron 식 ↔ 자연어 양방향 변환. [상세](app/tools/cron-trans/README.md)
- **주식 시뮬레이터** `/tools/stock-sim` — 평단가 / 배당 / 분할매수 시뮬레이션 (3 탭). [상세](app/tools/stock-sim/README.md)
- **영양제 플래너** `/tools/supp-plan` — 약동학 기반 개인 영양제 스케줄링. [상세](app/tools/supp-plan/README.md)

## 유니버설

- **피드백 시스템** — 모든 페이지 우하단 floating 버튼 + 대시보드 카드 아이콘. 자세한 사항은 루트 [CHANGELOG.md](./CHANGELOG.md)와 [PATTERNS.md](./PATTERNS.md).
- **관리자** `/admin/feedback` — Basic Auth gated 피드백 보드.

## `[slug]` fallback — `/tools/[slug]`

- Purpose: 미공개 도구 슬러그 진입 시 "coming soon" 안내
- Files: `app/tools/[slug]/page.tsx` + `client-page.tsx`
- Registry: `lib/tools-registry.ts`
