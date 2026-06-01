**먼저 읽기**: [`BRENNHUB.md`](./BRENNHUB.md) (정체성/이념/원칙)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Context maps

도구 작업 시 먼저 읽기: `app/tools/<tool>/{README,BACKLOG,CHANGELOG}.md`. 공유 패턴: 루트 `PATTERNS.md`. 인프라 변경 이력: 루트 `CHANGELOG.md`. 도구 목록 인덱스: 루트 `TOOLS.md`. 기존 패턴 재사용 우선.

# Output policy

작업 출력 약식:
- Plan: 그대로 (단계 + 근거 명시).
- 실행 중: 한 줄씩 ("X 실행 중", "Y 완료" 수준).
- 최종 보고: 그대로.

# Push policy

기본: 빌드 통과 + commit 완료 후 자동 push.

예외 (여전히 push 직전 정지):
- 파일/디렉토리 대량 삭제 (tool kill, 폴더 제거 등)
- git history 재작성 (rebase, force push, filter-repo)
- 큰 리팩토링 (대략 5+ 파일 동시 수정 또는 의미 있는 동작 변경)
- 프롬프트에 명시적으로 "push 직전 정지" 표기된 경우

# Deploy policy

배포는 브랜치 push로만 (Cloudflare Git Integration): `main` push → brennhub.com / `dev` push → dev.brennhub.com.

- 도구 작업 first step: 기존 도구 `git checkout feat/<tool>` + `git merge main` / 신규 도구 `git checkout -b feat/<tool> main`. feat는 도구당 long-lived 1개 (task별 분기·삭제 X).
- 수동 deploy 명령 (`npm run deploy` / `wrangler deploy` / `opennextjs-cloudflare deploy`) 은 어떤 경우에도 자동 실행 금지 — 사용자가 명시적으로 지시한 경우에만.
- 시행 시점: 2026-05-20 dev → main reset 이후. 상세: BRENNHUB.md § 5/6/7.

# Main push 자동 강제 (pre-push hook)

`git push origin main` 시 `.husky/pre-push`가 두 가지 검사:

1. **lib/releases.ts 변경 강제** — release entry 누락 차단. 우회 토큰 `[skip-release]` (사용자 체감 0인 internal refactor만).
2. **dev 검증 강제** — main range의 non-merge commit이 `origin/dev`에 reachable 인지. 즉 feat가 먼저 dev를 거쳤는지. 우회 토큰 `[skip-dev-check]` (hotfix / 사용자 명시 승인 예외만).

검사 둘 다 통과해야 push 성공. 우회 토큰은 머지 commit message에 명시. **토큰 우회는 사용자 명시 승인이 있는 경우에만**; Claude 임의 판단으로 토큰 박지 말 것. 위반 = 신뢰 손실.

# 릴리스 노트 기록 (자동, 2단계 — Union 모델)

외부 사용자용 공개 릴리스 노트는 `lib/releases.ts`(파일=소스, git audit trail) ∪ D1 `releases` 테이블(=admin 오버레이/tombstone/신규)이다. `/releases`는 둘을 합쳐 D1 우선·deleted 제외·date desc로 렌더. `/admin/releases`에서 Brenn이 편집·삭제·추가.

**파일에 항목 추가 = 자동으로 `/releases`에 노출** (페이지 read는 union이라 build/CI 불요). **main push 시점에 entry 누락은 시스템이 차단** — `.husky/pre-push` hook이 `lib/releases.ts` 변경 없는 main push를 거부.

- **시점**: **dev 머지 시점에 파일 entry 추가** — dev.brennhub.com/releases에서 노출·문구·정렬 미리 검증 → main 머지로 prod 반영(brennhub.com)에 그대로 노출. 작업 thread는 dev 머지 직전/직후 entry 추가가 정상 흐름. 다른 CC thread가 dev에 머지하면 그 thread가 entry를 함께 추가.
- **누락 차단 (자동)**: `git push origin main` 시 `.husky/pre-push` hook이 새 commit 범위에서 `lib/releases.ts` 변경을 검사. 없으면 push 차단. 우회 토큰 `[skip-release]`를 머지 commit message에 명시하면 통과 — 사용자 체감 0인 internal refactor·빌드 fix 등에만 사용.
- **date**: prod 노출 예정일(main 머지 예정일). dev에선 미리 보이지만 사용자 표시상 date는 prod 기준이 정합. main 머지가 미뤄지면 date 갱신.
- **무엇**: 사용자 체감 신규/개선/수정만. 내부 리팩토링·빌드·인프라 변경은 제외. 판정 기준 — 사용자가 화면에서 차이를 보면 yes, 아니면 no.
- **말투**: 사용자 언어. 개발 용어(commit, refactor, schema, D1, 마이그레이션 등) 금지. "AI"는 어디서도 노출 X (BrennHub UI 원칙).
- **항목 모양**: `{ id: <stable-kebab>, date: "YYYY-MM-DD", tool: <slug>|"site", title: {ko,en}, body: {ko,en}, kind?: "new"|"improved"|"fixed" }`.
- **id 규칙**: 파일 entry는 명시적 안정 id 필수 (오버라이드 매칭 키). **한 번 정한 id는 변경 금지** — 변경 시 기존 admin 오버라이드/tombstone이 orphan화되어 silent 유실. 컨벤션: `<tool-slug>-<짧은-feature-or-launch>` (예: `tag-it-launch`, `stock-sim-dividend-csv`).
- **충돌 안 함**: admin이 동일 id를 편집하면 파일 변경은 가려진다. 파일을 다시 살리려면 admin에서 해당 행을 "복원"하거나 D1 row 자체를 삭제. 즉 파일은 audit, D1은 진실.
