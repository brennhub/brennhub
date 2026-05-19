# BrennHub Changelog (인프라 / 전역)

도구 무관 인프라 변경. 도구 전용 변경은 각 도구의 `app/tools/<tool>/CHANGELOG.md`.

## 2026-05-12
- 팩토리 부트스트랩 — Next.js + Cloudflare (OpenNext) 셋업.
- N-language i18n 인프라 (ko, en 동시 출시).

## 2026-05-16
- **피드백 시스템 (universal)** — D1 스키마, `POST /api/feedback`, 자체 modal Dialog, 우하단 floating 버튼 (페이지별 defaultTool 자동 매핑), 대시보드 카드 아이콘.
- **Cloudflare preview env** — `env.preview` 블록 (worker `brennhub-dev`, dev D1 binding, `dev.brennhub.com` route). `npm run deploy:preview`.
- **GitHub Actions Deploy Preview** — `dev` 브랜치 push 시 Cloudflare 자동 배포 (Linux ubuntu-latest, OpenNext-Windows 호환성 우회).
- (CI) Node 22로 bump (wrangler 요구사항).

## 2026-05-17
- **GitHub Actions Check** — `dev/main` push 시 lint + build 자동 검증.
- **ESLint 규칙 조정** — `react-hooks/set-state-in-effect` warn 다운그레이드, `_` prefix unused vars 허용. `.open-next/` `.wrangler/` ignore.
- **Husky + lint-staged** — pre-commit hook에서 staged 파일 자동 lint. "말 아닌 시스템 강제".
- **Admin feedback board (MVP)** — `/admin/feedback`. Basic Auth (middleware.ts, `ADMIN_PASSWORD` secret). D1 query + 테이블 + 한국어 라벨 매핑 (KST 시간).
- (fix) Admin Basic Auth — `getCloudflareContext` 제거 + `process.env` 사용 (edge runtime 호환). `proxy.ts` 시도 후 OpenNext 미지원 발견 → `middleware.ts`로 복귀.
- **Admin polish** — 필터링 (도구/카테고리/상태), 상태 cycle 토글 (new → read → resolved), LocaleToggle `/admin` 숨김.
- **다크모드** — `ThemeProvider` + 토글 (Sun/Moon, `/admin` 숨김). FOUC 방지 inline script. zinc 베이스 eye-friendly 팔레트. 기본 light, localStorage 영속.

## 2026-05-19
- **컨벤션 명문화 (OpenNext runtime)** — API route 파일에 `export const runtime = "edge"` 금지. BRENNHUB.md § 7 + PATTERNS.md § D1/Cloudflare 명시. 근거: saju-naming Task 39 진단 시리즈 (0.5.0~0.6.2, 5+1 시도 후 매듭, `f7fb99c`).
