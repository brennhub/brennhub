**먼저 읽기**: [`BRENNHUB.md`](./BRENNHUB.md) (정체성/이념/원칙)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Context maps

도구 작업 시 먼저 읽기: `app/tools/<tool>/{README,BACKLOG,CHANGELOG}.md`. 공유 패턴: 루트 `PATTERNS.md`. 인프라 변경 이력: 루트 `CHANGELOG.md`. 도구 목록 인덱스: 루트 `TOOLS.md`. 기존 패턴 재사용 우선.

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
