# BrennHub — 정체성·이념·원칙

이 문서는 brennhub의 정신·미션·원칙을 repo 기록 + git history에서 추출한 단일 reference. 새 Claude thread 인수인계용. **추측 없음, 사실 기반만.** 출처 표기는 각 항목 옆.

---

## 1. 정체성

- **이름**: `brennhub` (소문자, 인프라/패키지) / **BrennHub** (대문자 혼합, UI 브랜드). 출처: [README.md:1](README.md), [git `cb20fad chore: rebrand UI to BrennHub (mixed case)`].
- **소유자**: brenn (Brenn). 출처: [README.md:3] "Indie tools by brenn".
- **본질**: 단일 Next.js 앱 안에 도구 카탈로그가 자라는 **팩토리**. 출처: [README.md:3,30-32], [git `7c1ef5e chore: bootstrap brennhub factory`].
- **표어**: "Indie tools by brenn — **small, sharp, opinionated**. A single Next.js app that hosts a growing collection of tools under one roof." 출처: [README.md:3].

### brennhub 우산 (umbrella) 정의

brennhub은 게임 / SaaS / 사이드 프로젝트 전부의 **우산 브랜드**.

세 repo:
- `brennhub/brennhub` — 통합 개발 사이트 (brennhub.com)
- `brennhub/dojo` — 언어 결투장 서비스 (별도 도메인 또는 brennhub.com 산하)
- `brennhub/magic-survivor` — 게임 (Godot)

**본 문서의 원칙들은 `brennhub/brennhub` (이 repo) 기준.** dojo / magic-survivor에 적용 여부는 별개 판단.

출처: 과거 대화 (2026-05-16, magic-survivor 마이그레이션).

## 2. 설립 이념 / 미션

- **팩토리 모델**: 허브 페이지가 모든 도구를 나열, 각 도구는 `/tools/<slug>`, 카탈로그는 단일 registry로 구동. 한 파일 + 한 페이지 추가로 새 도구 출시. 라우팅 설정·메뉴 배선 X. 출처: [README.md:30-32].
- **Build-in-public, 정직**: 만들었다가 retire한 도구도 archived 섹션에 남김. 출처: [README.md:158-162] (ssl-check retire 기록), [git `610d591 chore: remove ssl-check tool (upstream CT logs unreliable, low differentiation)`].
- **명시적 미션 선언문**: repo 기록 상 한 문장으로 정리된 미션 선언은 **없음**. 위 표어가 가장 근접.

## 3. 핵심 가치 (의사결정 기준)

- **Small, sharp, opinionated**: 도구는 작고 명확하고 의견이 있는 것. 출처: [README.md:3].
- **차별점 없으면 retire**: 상류 신뢰성 + 시장 대안 다수 → 손절. 출처: [README.md:162] (ssl-check 사례: "차별점 부족(ssllabs, openssl, 브라우저 등 대안 많음)").
- **결정론적 계산을 AI보다 우선** (saju-naming): "환각 없는 계산 — 사주/오행/획수는 결정론적 알고리즘. AI는 의미·어감 보조만." 출처: [app/tools/saju-naming/README.md:7].
- **말 아닌 시스템 강제**: 규칙은 prompt만으로는 신뢰 불가. CI/hook으로 자동화. 출처: [CHANGELOG.md:18] "Husky + lint-staged — pre-commit hook에서 staged 파일 자동 lint. '말 아닌 시스템 강제'".

### 유지보수성 (Maintainability) — 최상위 기술 원칙

사용자 본인 명시: **"서비스가 지속적으로 유지보수가 잘 되는 방향으로 해야해. 내가 이것만 보고 있을 수 없기 때문이야."**

적용 규칙:
- 새 도구 추가 시 기존 스택 유지 (Cloudflare Workers + D1). 별도 인프라(FastAPI/Supabase/Vercel 등) 추가 금지.
- 단일 배포 파이프라인 유지. 마이크로서비스 분리 금지.
- 관리 포인트가 늘어나는 기술 결정은 강한 정당성 필요.
- "지금 잘 돌아감"보다 "**6개월 후에도 손 안 가도 돌아감**"이 더 중요.

배경: 솔로 빌더 + 풀타임 본업 동시 진행.

출처: 과거 대화 (2026-05-19, saju-naming 스택 결정).

### 효능감 (Real Usefulness) — UX 평가 기준

시각적 완성도 ≠ 실사용 효용. 도구는 "보기 좋음"이 아니라 "**실제로 얼마나 유용한가**"로 평가.

사용자 본인 평가 예시: 영양제 플래너 MVP 3차 iteration 후 "효능감 30%" 자가 평가. → 시각적/기능적 완성도와 별개로 일상 사용 시 효용은 아직 부족하다는 의미. 지속적 사용 피드백 기반 튜닝 필요.

적용 규칙:
- 사용자가 일상에서 실제로 쓸 것인가를 가장 먼저 묻는다.
- 멋있어 보이는 기능보다 매일 사용하게 되는 기능 우선.
- "완성"이 아니라 "**지속적 개선**" 모드.

출처: 본 thread (2026-05-17, supp-plan 검증).

## 4. 디자인 원칙

- **"AI" 단어를 사용자 UI에 노출하지 말 것**: 라벨·헤딩·설명·버튼·푸터·툴팁 어디에도. AI는 구현 디테일, user-facing 가치 아님. 산출물 기준으로 명명 (`종합 분석`, `결과 요약`, `Summary`, `Verdict`). 출처: [README.md:69-80], [git `3ccf3de refactor: remove 'AI' branding from tool UI`].
- **다크/라이트 모드 + 토글**: 기본 light, localStorage 영속, zinc 베이스 eye-friendly 팔레트, FOUC 방지 inline script. 출처: [CHANGELOG.md:22] "다크모드".
- **한국어/영어 이중언어**: 모든 user-facing 문자열은 `lib/i18n/messages.ts`에 `Messages` 타입 등록 + ko/en 둘 다 정의. Namespace는 도구별 nested. 출처: [PATTERNS.md:113-116], [README.md:84-132] "Adding a new language".
- **상승·하락 색 컨벤션 분리**: KR (빨 상승 / 파 하락) vs US (그 반대). `<html data-color-scheme>` + CSS 변수. 사용자 토글. 출처: [PATTERNS.md:42-44].
- **광고**: repo 기록 상 광고 도입/금지 **명시적 언급 없음**. (현재 시점 사실: 광고 코드/스크립트 부재.)

## 5. 기술 원칙

- **스택**: Next.js 16 (App Router, TS, Turbopack) + Tailwind v4 (CSS-first) + Cloudflare Workers (OpenNext adapter) + D1 + Workers AI/Anthropic. 출처: [package.json:17-46], [README.md:5-10].
- **Server Component 우선**: D1 fetch는 `page.tsx` server에서, 인터랙티브 부분만 client wrapper. 출처: [app/tools/supp-plan/README.md:4] "Server, D1 fetch → client-shell".
- **동일 스택 통일 (별도 백엔드 운영 X)**: 모든 신규 도구도 Workers + D1로. 출처: [app/tools/saju-naming/README.md:11-20] "다른 도구와 동일 스택 (피드백/영양제 플래너). 별도 백엔드 운영 X."
- **Storage abstraction (미래 마이그레이션 대비)**: interface + impl 분리. supp-plan의 `PersonalScheduleStorage` 패턴 — 로그인 도입 시 `D1ScheduleStorage` 새로 만들고 export 한 줄 교체. 출처: [PATTERNS.md:91-93].
- **localStorage hydrate + persist + schemaVersion 마이그레이션**: stock-sim/supp-plan 모두. 의미 변경 시 한 줄 주석으로 의도 명시. 출처: [PATTERNS.md:69-73].
- **D1 binding 구조**: top-level (prod) + `env.preview` 블록 (전체 binding 명시, 상속 X). 출처: [PATTERNS.md:118-122].
- **Cloudflare Git Integration 자동 배포** (2026-05-20 정정):
  - `main` 브랜치 push → **brennhub.com prod 자동 배포**. Cloudflare Git Integration이 Linux 환경에서 OpenNext build + deploy 수행.
  - `dev` 브랜치 push → dev.brennhub.com preview 자동 배포.
  - ⚠️ 정정: 이전 BRENNHUB.md는 "main push ≠ 자동 배포, `npm run deploy` 수동 필요"로 가정했으나 **오진**. Cloudflare Git Integration이 main을 prod에 자동 배포함 (2026-05-20 lineup-builder 사고에서 발견).
- **수동 deploy 명령 금지**: `npm run deploy` / `opennextjs-cloudflare deploy` / `wrangler deploy` 를 어떤 환경·세션에서도 자동 실행 X. Cloudflare 자동 배포와 충돌 + Windows 로컬 빌드 산출물의 prod 진입 위험 (2026-05-20 사고 직접 원인). 배포는 오직 브랜치 push로만.
- **CI/CD 검증**:
  - `dev/main` push → lint + build 자동 검증 (GitHub Actions). 출처: [CHANGELOG.md:16].
  - pre-commit hook은 staged 파일에 `eslint --fix`. 출처: [package.json:47-49].
- **OpenNext + Windows 빌드 호환성 우회**: prod/preview 빌드는 Cloudflare / GH Actions Linux 환경. 로컬 Windows 빌드 산출물은 배포 금지. 출처: [CHANGELOG.md:12].
- **next.js의 새 버전 가정 무시 금지**: "This is NOT the Next.js you know" — APIs/conventions/structure 학습 데이터와 다를 수 있음. 코드 전 `node_modules/next/dist/docs/` 읽기. 출처: [AGENTS.md:1-5].

## 6. 도구 추가 필수 절차

### 표준 개발 흐름 (브랜치 정책)

도구마다 long-lived feat 브랜치 1개. (2026-05-20 도입 → long-lived 전환)

- **도구당 브랜치 1개**: `feat/<tool>` (예: `feat/saju-naming`, `feat/lineup-builder`). task별 분기·삭제 X — 도구가 살아있는 한 유지.
- **신규 도구**: `git checkout -b feat/<tool> main` (최초 1회).
- **기존 도구 새 task 시작**: `git checkout feat/<tool>` → `git merge main` (main 최신 변경 sync).
- 작업 + commit.
- **중간 확인**: feat → `dev` 머지 + push → dev.brennhub.com에서 확인 (필요 시 반복).
- **완성 + 최종 확인**: feat → `main` 머지 + push → brennhub.com 자동 배포.
- main 머지 후 feat 브랜치는 **유지** (삭제 X). 다음 task는 `git merge main` 재실행으로 시작.

핵심 원칙:
- **feat 분기는 항상 `main`에서** (신규 도구 최초 1회). main 기준이라 main 머지가 깨끗.
- **task 시작 전 `git merge main` 필수** — feat가 stale하면 충돌·낡은 베이스 위험.
- **분기와 머지는 독립** — feat는 어디서 시작했든 dev·main 양쪽 다 머지 가능.
- `dev` = 통합 테스트 staging (여러 feat 머지 가능, 모래사장). `main` = prod 직결 (Cloudflare 자동 배포).
- 사유: 솔로 빌더 관리 부담 ↓ + 도구별 격리는 long-lived로도 충족 + 도구당 작업 공간 상존.

### 외부 기획서 필터 (도구 신규 plan 검토 시 반드시 확인)

외부 기획서를 받았더라도 brennhub 적용 시 다음 필터 적용:

1. **가격 페이지 / 결제 UI**가 기획서에 있으면 → **제외**
2. **별도 백엔드 스택** (FastAPI, Python, Supabase 등)이 있으면 → **brennhub 스택(Workers + D1)으로 재설계**
3. **광고 슬롯**이 있으면 → **제외**
4. **tools-registry 등록** 누락되면 → **필수 추가**
5. **feedback-dialog / feedback-button 통합** 누락되면 → **필수 추가**
6. **i18n (ko/en)** 누락되면 → **필수 추가**
7. **도구 폴더 안 README/BACKLOG/CHANGELOG** 없으면 → **필수 생성**

**외부 기획서를 무비판적으로 따라가는 것이 가장 흔한 사고 원인.**

### 통합 체크리스트 (구현 단계)

1. **Registry 등록 + 페이지 둘 다**: [README.md:34-67]. 둘 중 하나만 하면 라우팅 충돌 또는 404.
   - placeholder: `lib/tools-registry.ts`에 `status: "coming-soon"`만 추가 → `[slug]`가 자동 처리.
   - live: `app/tools/<slug>/page.tsx` 생성 + registry에 `status: "live"`. `npm run build` 출력에 `/tools/<slug>`가 별도 row인지 확인.
2. **문서 colocate**: `app/tools/<slug>/{README,BACKLOG,CHANGELOG}.md` 3개 파일. 루트 `TOOLS.md`/`BACKLOG.md`는 인덱스. 출처: [AGENTS.md:9], [git `54e29c5 docs: split tool docs`].
3. **i18n 추가**: `lib/i18n/messages.ts`의 `Messages` 타입에 새 namespace 등록 + ko/en 둘 다 정의 + `tools` 객체에 `<slug>.{name, description}` 추가. 출처: [PATTERNS.md:113-116], [README.md:84-132].
4. **피드백 통합**: 신규 도구는 `FeedbackTool` 타입 + `feedback-button.tsx`의 pathname 매핑 + `feedback-dialog.tsx` toolOptions + `api/feedback/route.ts`의 TOOLS enum + admin page 라벨 매핑 + i18n `feedback.toolXxx`. 출처: [Task 31 supp-plan integration].
5. **공유 패턴 재사용**: 새로 만들기 전에 `PATTERNS.md` 확인. NumberStepper / SearchableSelect / Switch / Currency·ColorScheme provider 등. 출처: [AGENTS.md:9], [PATTERNS.md].

## 7. 금기사항 (Don'ts)

### Repo/코드 기반

- **"AI" 단어 user-facing 노출**: 라벨/헤딩/설명/버튼/푸터/툴팁 어디에도. 출처: [README.md:69-80].
- **registry 우회한 app/page.tsx 직접 카드 추가**: 대시보드 카드는 `lib/tools-registry.ts` map으로 자동 노출. registry에 entry만 추가하면 됨. 출처: [README.md:30-67].
- **registry에 entry만 두고 페이지 안 만들기 (또는 그 반대)**: 라우팅 충돌 또는 404. 출처: [README.md:48-54] (route collision 표).
- **route collision 무시**: 도구 페이지가 있는데 status가 여전히 `"coming-soon"`이면 빌드 시점에 `[slug]`와 정적 페이지가 둘 다 `/tools/<slug>` 라우트를 emit → prod 404. 출처: [README.md:50], [git `7f25d5d fix: prevent route collision between [slug] and dedicated tool pages`].
- **별도 백엔드 운영**: 신규 도구도 Workers + D1로 통일. 출처: [app/tools/saju-naming/README.md:20].
- **OpenNext 미지원 Next.js 기능 사용**:
  - (1) `proxy.ts`는 Node.js runtime 강제 → 미지원. `middleware.ts` (edge) 사용 필수.
  - (2) **API route 파일에 `export const runtime = "edge"` 명시 금지** — OpenNext + Cloudflare adapter 미지원. Webpack 빌드에서 명시 에러 ("edge runtime function must be defined in a separate function"), Turbopack에서는 silent broken bundle 생성. runtime 미명시가 정상 (Workers 환경 default 처리).
  - 출처: [CHANGELOG.md:20], [git `458a7c8 fix(admin): use process.env for basic auth (edge runtime compat)`, `f7fb99c fix(saju-naming): remove export const runtime = "edge" (real fix)`], [app/tools/saju-naming/CHANGELOG.md 0.5.0~0.6.2 진단 시리즈].
- **.tscn / project.godot**: brennhub은 Next.js 프로젝트로 **해당 없음** (다른 repo `brennhub/magic-survivor` 규칙).
- **dev → main 직접 머지 금지**: dev는 여러 도구의 미완성 commit이 섞인 staging. dev를 main에 통째로 머지하면 미완성이 prod로 샘 (2026-05-20 lineup-builder 사고 직접 원인). main에는 feat 브랜치만 머지.
- **feat 브랜치 안에서 재분기 금지**: 관리 복잡도 ↑. feat는 단일 task 단위로 평면 유지.
- **`main` / `dev`에 직접 commit 금지**: 모든 변경은 feat 브랜치를 거쳐 머지. (2026-05-20 정책 도입 — 본 정책 명문화 commit 자체는 시행 전 마지막 예외.)
- **동일 도구 내 동시 task 작업 금지**: 한 `feat/<tool>`에 여러 미완 task commit이 누적되면 main 머지 시 미완성 혼입. 직렬 진행. 예외: 동시 진행 불가피 시 short-lived sub-feat (`feat/<tool>-<hotfix>`, main에서 분기) 허용 — main 머지 후 삭제.
- **새 task 시작 전 `git merge main` 누락 금지**: stale feat는 머지 충돌·낡은 베이스 위험.
- **Claude Code 세션의 수동 deploy 명령 자동 실행 금지**: `npm run deploy` / `wrangler deploy` 등은 사용자 명시 지시 없이 실행 X. (2026-05-20 wrangler logout 조치 + 본 정책 명문화.)

### 명시적 금기 (chat 기반)

- **가격 페이지 / 결제 / Pro 티어 생성 금지** (현 단계). 도구 신규 추가 시 기획서에 가격 정보 있더라도 brennhub 컨텍스트에 맞춰 제외. 수익화는 12개월+ 후 별도 결정.
- **광고 도입 금지**. brennhub 인디 미학과 양립 불가.
- **별도 인프라/서비스 추가 금지** (Python 백엔드, 외부 DB 등). 유지보수성 원칙.
- **app/page.tsx 카드 수동 추가 금지**. `lib/tools-registry.ts` entry로 자동 노출.

출처: 본 thread (2026-05-17, 수익화/카피 방어 자문).

## 8. 작업 규칙 (Claude Code와 협업 시)

- **언어**: 한국어. 출처: [AGENTS.md 본문 한국어 + 모든 commit 메시지/문서 한국어].
- **Plan 먼저, 승인 후 실행**: 거의 모든 task에서 사용자가 명시. 출처: 사용자 task 명세 반복 패턴.
- **Push policy** (출처: [AGENTS.md:11-19]):
  - 기본: 빌드 통과 + commit 완료 후 **자동 push**.
  - 예외 (push 직전 정지):
    - 파일/디렉토리 대량 삭제
    - git history 재작성 (rebase, force push, filter-repo)
    - 큰 리팩토링 (대략 5+ 파일 동시 수정 또는 의미 있는 동작 변경)
    - 프롬프트에 명시적으로 "push 직전 정지" 표기된 경우
  - 출처: [git `ed79f07 chore: update push policy to auto-push by default`].
- **Context maps** (출처: [AGENTS.md:7-9]):
  - 도구 작업 시: `app/tools/<tool>/{README,BACKLOG,CHANGELOG}.md` 먼저.
  - 공유 패턴: 루트 `PATTERNS.md`.
  - 인프라 변경 이력: 루트 `CHANGELOG.md`.
  - 도구 목록 인덱스: 루트 `TOOLS.md`.
- **기존 패턴 재사용 우선**: 새 의존성 추가보다 자체 구현 (FeedbackDialog가 shadcn Dialog 대신 자체 modal로 간 사례). 출처: [PATTERNS.md:17-21], 여러 commit.
- **Pre-commit hook**: `.husky/pre-commit` → `lint-staged` → `eslint --fix` (staged ts/tsx/js/jsx/mjs). 출처: [package.json:15,47-49].
- **검증 흐름 표준**: 변경 → `npm run build` (TS + Next 검증) → pre-commit hook 자동 lint → commit → push (정책 따라). 출처: 반복 작업 패턴 + [CHANGELOG.md].
- **`Co-Authored-By: Claude Opus 4.7 ...` trailer**: 모든 협업 commit에 포함. 출처: 모든 협업 commit 메시지 history.

---

## 부록: 핵심 출처 파일

| 파일 | 역할 |
|---|---|
| `README.md` | 팩토리 모델, 도구 추가 절차, i18n 추가, "AI" 미노출 원칙, archived 도구 |
| `AGENTS.md` | Next.js 경고, context maps, push policy |
| `PATTERNS.md` | 공유 컴포넌트 + 내부 패턴 + hooks + i18n 규칙 + D1 규칙 |
| `CHANGELOG.md` | 인프라/전역 변경 이력 (피드백 시스템, CI/CD, 다크모드 등) |
| `TOOLS.md` | 도구 목록 인덱스 |
| `BACKLOG.md` | 미완 항목 인덱스 (도구별 + 전역) |
| `app/tools/<tool>/{README,BACKLOG,CHANGELOG}.md` | 도구별 상세 |
| `lib/tools-registry.ts` | 도구 자동 노출 single source of truth |
| `package.json`, `wrangler.jsonc` | 스택 + 인프라 binding |
| `git log` | 결정의 사실적 흔적 |
