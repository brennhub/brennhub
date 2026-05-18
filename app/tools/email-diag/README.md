# 이메일 발송 진단기 — `/tools/email-diag`

- **Purpose**: 도메인의 SPF / DMARC / MX / PTR 진단 + AI 요약
- **Main**: `app/tools/email-diag/page.tsx`
- **API**: `app/api/email-diag/route.ts` (Cloudflare Workers AI 또는 Anthropic)
- **i18n**: `emailDiag.*`
- **Status**: production

공유 패턴은 루트 [PATTERNS.md](../../../PATTERNS.md). 변경 이력은 [CHANGELOG.md](./CHANGELOG.md), 미완 항목은 [BACKLOG.md](./BACKLOG.md).
