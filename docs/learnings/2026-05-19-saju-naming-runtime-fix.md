# saju-naming Task 39 진단 시리즈 — 학습 요약

**Date**: 2026-05-19
**Context**: brennhub saju-naming 도구 신규 추가 중 dev 환경 500 에러 트러블슈팅
**Outcome**: 5+1 시도 후 진짜 root cause 도달 + 컨벤션 명문화

---

## 1. 진짜 root cause

**OpenNext + Cloudflare adapter는 `export const runtime = "edge"` 미지원.**

증거:
- `@opennextjs/cloudflare/dist/cli/commands/migrate.js:145-146`: "The edge runtime is not supported yet with @opennextjs/cloudflare."
- `@opennextjs/aws/dist/build/copyTracedFiles.js:128`: edge runtime route를 별도 function으로 정의 안 하면 throw
- brennhub 내부 선례: `middleware.ts` Task 25-A-fix (0.5.4)에서 같은 이유로 이미 제거됨

증상:
- Webpack 빌드: 명시 에러 (`cannot use the edge runtime`)
- Turbopack 빌드: silent broken bundle 출력 → runtime에 `TypeError: Cannot read properties of undefined (reading 'default')` + fingerprint `ee32c12c6a6a6abd6193926ddbfd4ed7`
- supp-plan/library 등 다른 도구는 명시 안 함 → 정상 동작

---

## 2. 시도 시리즈 (5+1)

| # | 가설 | 시도 | 결과 | 교훈 |
|---|---|---|---|---|
| 0.5.1 | `korean-lunar-calendar` exports 조건 부재 | namespace + unwrap | 실패, fingerprint ee32c12c | import 형태 무관 |
| 0.5.2 | exports gating 우회 | ESM bundle vendoring | 실패, 같은 fingerprint | vendor 위치 무관 |
| 0.5.3 | esbuild interop 우회 | vendor + named import | 실패, 같은 fingerprint | export 형태 무관 |
| 0.5.4 | Turbopack 엣지케이스 | Webpack 강제 (`--webpack`) | **진단 핵심** — 진짜 에러 노출 | **Turbopack의 silent fail이 5번 시도를 헛수고로 만들었음** |
| 0.6.0 | 2단 중첩 경로 | `hanja/search` → `hanja-search` | 실패, 같은 빌드 에러 | 부차 (컨벤션 정렬용 유지) |
| **0.6.1** | **`runtime = "edge"` 명시 자체** | **3개 route에서 제거** | **✅ dev 3개 200** | **진짜 root cause** |
| 0.6.2 | — | Turbopack 복귀 + 검증 | 3개 200 유지 | silent fail 재발 X |
| e4f3db8 | — | BRENNHUB/PATTERNS 컨벤션 명문화 | — | 향후 재발 방지 |

---

## 3. 향후 도구 추가 시 체크리스트 (재발 방지)

### API route 작성 시
- ❌ `export const runtime = "edge"` 명시 (OpenNext 미지원)
- ✅ runtime 미명시 — Workers 환경 default 처리. supp-plan/library 패턴 일관.
- 출처: BRENNHUB.md § 7 (2)

### 빌드 검증 시
- Turbopack은 OpenNext 위반을 silent하게 broken bundle로 만들 수 있음
- **dev 배포 후 실 curl 검증 필수** — 로컬 빌드 통과 = 동작 보장 아님
- 의심 시 `next build --webpack` 일시 시도로 진짜 에러 노출 가능 (진단 도구로 활용)

### import 패턴
- 동작 도구(supp-plan/cron-trans/email-diag) 모두 named import 컨벤션
- default import 가능하면 피함 — esbuild interop 차이로 환경별 동작 변화 위험
- 외부 패키지 vendoring 시 `export { X }` 형태 (named) + 사용처 `import { X } from "..."` 일관

---

## 4. 진단 과정 메타 학습

### 1) fingerprint 일치는 결정적 신호
- Cloudflare logs의 `fingerprint`는 throw 위치 hash
- 3번 시도 모두 같은 fingerprint → 우리가 만진 영역은 root cause 아님
- 이 신호를 더 빨리 인지했다면 0.5.3에서 진단 방향 전환 가능 (lib import 가설 포기 + OpenNext layer 진단)

### 2) Turbopack silent fail은 가설 검증을 무효화
- 진짜 에러를 Webpack에서만 노출 → Turbopack 환경에서 가설 4번 검증한 게 헛수고
- 향후 의심 시 일찍 Webpack 시도

### 3) 가설 기반 fix는 3회 한계
- 같은 fingerprint로 3회 실패하면 **추측 중지 + 진단 도구(bundle 분석, 빌드 환경 변경) 진입**
- 본 thread에서는 0.5.4 (Turbopack OFF)가 그 전환점

### 4) brennhub 내부 선례 활용
- middleware.ts Task 25-A-fix가 같은 이유로 이미 제거됐다는 사실을 **0.5.1 단계에서 발견했더라면** 즉시 fix 가능
- 새 도구 진입 시 `git log --grep="runtime"` 또는 `grep -rn "runtime" .` 정찰 가치

---

## 5. brennhub 원칙 검증

| BRENNHUB.md 원칙 | 본 시리즈에서 적용 |
|---|---|
| 유지보수성 최우선 | 옵션 b (runtime 제거 단순 fix) vs 옵션 a (open-next.config functions 복잡 분리) — b 채택 |
| 기존 패턴 재사용 우선 | supp-plan/library 등 다른 도구 컨벤션 정렬 |
| 별도 인프라 추가 금지 | Workers + D1 단일 스택 유지 |
| 말 아닌 시스템 강제 | 컨벤션 명문화 (BRENNHUB.md § 7 + PATTERNS.md) → 향후 자동 참조 |
| Plan-first | 매 시도마다 Plan 승인 후 변경 |
| Push policy (5+ 정지) | 5번 시도 모두 push 직전 정지 + Brenn 결정 |

---

## 6. 다음 작업 자연스러운 흐름

- **39-B**: 9,389자 풀 데이터 적재 + 자원오행 매핑 + 원획법 변환 (Brenn 명리학 자료 공유 시 진입)
- **44**: UI live (39-B 완료 후)

새 thread 시작 권장. 컨텍스트 가볍게 + 작업 단위 명확.
