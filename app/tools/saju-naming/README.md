# 사주 작명 — `/tools/saju-naming` (내부) / `/naming` (랜딩)

사주팔자 기반 한국식 이름 추천 도구. 정확한 명리학 계산 + AI 보조.

## 핵심 차별점

- **환각 없는 계산** — 사주/오행/획수는 결정론적 알고리즘. AI는 의미·어감 보조만.
- **작명소 가격의 약 1/10** — 전통 작명소 $200-500 vs 본 도구 $29-49.
- **무제한 iteration** — 마음에 들 때까지 재추천.

## 아키텍처 (Workers + D1 통일)

| 컴포넌트 | 위치 | 비고 |
|---|---|---|
| 사주 계산 | Cloudflare Workers (Edge) | `korean-lunar-calendar` (Workers 호환) |
| 한자 / 81수리 / 오행 DB | Cloudflare D1 | binding `NAMING_DB` (예정) |
| AI 어감 분석 | Workers AI 또는 Anthropic | 의미·소리 보조 |
| 결제 | Stripe (예정) | $29 / $49 단발 |

다른 도구와 동일 스택 (피드백/영양제 플래너). 별도 백엔드 운영 X.

## 가격 모델

| 티어 | 가격 | 포함 |
|---|---|---|
| Free Preview | $0 | 사주 1회 조회 + 이름 후보 3개 |
| Basic | $29 | 후보 30개 + 한자 의미 + 81수리 |
| Premium | $49 | + AI 어감 분석 + 부모 의도 반영 + 무제한 iteration |

## 개발 단계

| Step | 범위 | Task |
|---|---|---|
| 1 | 사주 계산 엔진 | T37 사주팔자, T38 오행 분석 |
| 2 | 데이터 인프라 | T39 한자 DB, T40 81수리 |
| 3 | 추천 로직 + API | T41 이름 추천, T42 API endpoints |
| 4 | 웹 UI + 결제 + 출시 | T43-47 웹, T48 MCP 선택, T49 Launch |

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).

## 파일 구조 (예정)

```
app/
  naming/
    page.tsx              # 랜딩 (마케팅 페이지)
  tools/saju-naming/
    README.md             # 본 문서
    BACKLOG.md
    CHANGELOG.md
    poc/
      saju-poc.ts         # 사주 계산 PoC (Step 1 검증용)
    page.tsx              # 도구 본체 UI (예정)
    ...
  api/
    saju-naming/
      saju/route.ts       # 사주 계산
      candidates/route.ts # 이름 후보 생성
      ...

lib/
  saju-naming/
    types.ts
    calc/                 # 사주/오행/획수 결정론적 계산
    ai/                   # AI 보조 레이어
schema/
  saju-naming/
    schema.sql            # 한자/81수리/오행 테이블
    seed.sql              # 초기 데이터
```
