# 영양제 플래너 — `/tools/supp-plan`

- **Purpose**: 약동학 기반 개인 영양제 스케줄링 (라이브러리 + 시간순 뷰 + 호환성 경고)
- **Main**: `app/tools/supp-plan/page.tsx` (Server, D1 fetch) → `client-shell.tsx`
- **Subs**: `components/supp-plan/{library-view,schedule-form,schedule-view,schedule-table,candidates-view,searchable-select,time-stepper}.tsx`
- **API**: `app/api/supp-plan/library/route.ts` (GET, library + rules)
- **Storage**:
  - Cloudflare D1 — `brennhub-supp-plan` (prod) / `brennhub-supp-plan-dev` (preview). binding `SUPP_DB`. 라이브러리는 공유.
  - 개인 스케줄은 **localStorage** (`brennhub-supp-plan-schedule`). schemaVersion 마이그레이션 자동 (v1 → v2 → v3).
- **Types**: `lib/supp-plan/types.ts`. Storage abstraction: `lib/supp-plan/storage/{types,localStorage}.ts` (미래 D1 마이그레이션 대비)
- **Schema/seed**: `schema/supp-plan/{schema,seed}.sql`
- **i18n**: `suppPlan.*`
- **Compat warnings**: 같은 `state` + 시간 ±60분 윈도우 entries 짝짓기 → `compatibility_rules` 매칭
- **Status**: production (MVP)

공유 패턴은 루트 [PATTERNS.md](../../../PATTERNS.md). 변경 이력은 [CHANGELOG.md](./CHANGELOG.md), 미완 항목은 [BACKLOG.md](./BACKLOG.md).
