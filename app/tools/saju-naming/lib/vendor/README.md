# Vendored: `korean-lunar-calendar`

이 폴더의 파일은 npm 패키지 `korean-lunar-calendar`에서 **그대로 복사**한 vendored 자산입니다.

## 출처

- GitHub: <https://github.com/usingsky/korean_lunar_calendar_js>
- npm: <https://www.npmjs.com/package/korean-lunar-calendar>
- **버전**: `0.3.6`
- **라이센스**: MIT (저자 Jinil Lee, 2024) — 본 폴더의 `LICENSE` 참고
- **vendor 시각**: 2026-05-19

## 파일

| 파일 | 출처 |
|---|---|
| `korean-lunar-calendar.js` | `node_modules/korean-lunar-calendar/dist/esm/korean-lunar-calendar.js` (ESM bundle) |
| `korean-lunar-calendar.d.ts` | `node_modules/korean-lunar-calendar/dist/korean-lunar-calendar.d.ts` (타입) |
| `LICENSE` | `node_modules/korean-lunar-calendar/LICENSE` (MIT) |

## 왜 vendoring?

Cloudflare Workers Edge runtime + OpenNext 번들에서 패키지의 `exports` 필드가 `"import"` 조건을 정의하지 않아, default/namespace import 모두 `Cannot read properties of undefined (reading 'default')` 에러 발생. 패키지 internal path (`dist/esm/...`) 직접 import는 Next.js Edge bundler가 `exports` gating으로 차단 (옵션 C 빌드 실패).

→ ESM bundle을 도구 폴더 안으로 복사 + relative path import. npm 패키지 의존성 제거, 모든 환경 (Node tsx / Workers / Browser) 동일 동작.

상세 결정 경위는 saju-naming `CHANGELOG.md` `0.5.1` / `0.5.2` 참고.

## 업데이트 sync 방법

새 버전 검토 시:

```bash
npm view korean-lunar-calendar version              # 최신 버전 확인
npm install --no-save korean-lunar-calendar@<ver>   # 임시 설치
cp node_modules/korean-lunar-calendar/dist/esm/korean-lunar-calendar.js \
   app/tools/saju-naming/lib/vendor/korean-lunar-calendar.js
cp node_modules/korean-lunar-calendar/dist/korean-lunar-calendar.d.ts \
   app/tools/saju-naming/lib/vendor/korean-lunar-calendar.d.ts
# LICENSE/README는 변경 없으면 유지
```

이후 `poc/saju-poc.test.ts` 재실행으로 회귀 확인 + 본 README의 버전 갱신.

## 사용처

- `app/tools/saju-naming/lib/saju.ts`
- `app/tools/saju-naming/poc/saju-poc.ts`

다른 도구가 음양력 변환이 필요해지면 별도 vendor 폴더 (예: `app/tools/<other>/lib/vendor/`) 또는 공통 위치(`lib/vendor/`)로 승격 검토.
