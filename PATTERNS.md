# Patterns

재사용 컴포넌트 / 패턴 / hooks 지도. 코드 복붙 X — 파일을 읽고 확장하세요. 항목당 5-8줄, **핵심 시그니처 + 사용 위치 + 1-2개 주의사항**만.

## Components

### Layout-level (모든 페이지)

#### LocaleToggle — `components/locale-toggle.tsx`
- KO/EN 토글. `<header>` 안 (`app/layout.tsx`).
- 의존: `useLocale()`. 선택은 localStorage 저장.

#### FeedbackButton — `components/feedback-button.tsx`
- 우하단 floating pill. `usePathname()` → `defaultTool` 자동 매핑 (email-diag/cron-trans/stock-sim/site). `/admin*` 숨김.
- 내부 state로 `<FeedbackDialog>` 마운트.

#### FeedbackDialog — `components/feedback-dialog.tsx`
- 자체 modal (shadcn 없이): fixed overlay + ESC/outside-click close + body scroll lock.
- Props: `{ open, onOpenChange, defaultTool? }`. defaultTool 변경 시 selector 동기화.
- State: `idle / submitting / success / error`. 성공 시 2초 후 자동 닫힘.
- 4-btn 그룹 × 2 (tool, category) + textarea (counter `n/2000`) + email (optional).

### Stock-sim shared (3 sub-files 공통)

#### NumberStepper — `components/number-stepper.tsx`
- 4-button (small ▲▼ + big ▲▲▼▼) numeric input.
- Props: `value, onInputChange, onStep, smallStep, bigStep, min, max, displayFormatter, maxReachedMessage, minReachedMessage, className`
- Smart rounding: 비정수 → ceil/floor first. Bound 도달 시 warning popup (2.5s + fade, 클릭 dismiss).
- 사용: dca-down-calculator (5+ instances). cost-basis/dividend도 확장 가능.

#### Switch — `components/switch.tsx`
- 단순 on/off 토글. Props: `checked, onCheckedChange, id, aria-label`.

#### Tabs — `components/tabs.tsx`
- stock-sim page.tsx 탭 라우터.

#### CurrencyProvider + CurrencyToggle — `components/currency-{provider,toggle}.tsx`
- USD ↔ KRW. exchange rate (API rate 또는 manual override).
- `useCurrency()` → `{ currency, rate, apiRate, manualRateInput, setManualRateInput }`.
- USD가 internal storage 단위. parse/format은 `lib/format/currency.ts`.

#### ColorSchemeProvider + ColorSchemeToggle — `components/color-scheme-{provider,toggle}.tsx`
- "kr" (빨 상승 / 파 하락) vs "us" (그 반대). `<html data-color-scheme>` → CSS `--color-gain`/`--color-loss`.
- `useColorScheme()`. 사용: `text-[var(--color-gain)]` 패턴.

#### ManualRateInput — `components/manual-rate-input.tsx`
- 환율 수동 입력 (currency-toggle 옆). X 버튼으로 reset → API rate fallback.

### Supp-plan shared

#### LibraryView / ScheduleForm / ScheduleView — `components/supp-plan/*.tsx`
- Server-rendered library (D1) → props로 client에 전달. State는 client-shell.tsx에서 관리.
- ScheduleForm: 모달, 라이브러리 select 또는 custom name. State/time/days/dosage/notes.
- ScheduleView: state별 그룹 카드. 호환성 경고는 entry 카드에 inline.

## Internal Patterns

도구 안에서만 재사용. 다른 도구로 복제 시 참고.

### Tax-style 4-button toggle with deselect-on-reclick
- 예: `dca-down-calculator.tsx` `handleTermClick(type)` — 선택된 버튼 재클릭 시 `setTaxType("custom") + setTaxRate("0")`.
- 핵심: `variant={selected === val ? "default" : "outline"}` + 핸들러에서 동등성 체크.

### Validity guard summary
- Invalid 입력 시 카드/테이블 unmount하지 말고 **mount 유지 + value만 "—" swap**. 점멸 방지.
- 예: `dca-down-calculator.tsx` SummaryRow `value={computed.valid ? ... : "—"}`, `dca-down-detail.tsx` rounds empty → `colSpan` placeholder row.
- Hint는 input card 하단에 inline (외부 별도 box X).

### localStorage hydrate + persist effect
- 패턴 (stock-sim 전체):
  - `const [hydrated, setHydrated] = useState(false)` + load effect (`useEffect(() => { ... setHydrated(true) }, [])`)
  - persist effect: `useEffect(() => { if (!hydrated) return; setItem(...) }, [hydrated, ...deps])`
- 의미 변경 시 마이그레이션: 로드 시 해당 키 무시 + 한 줄 주석으로 의도 명시.

### NumberStepper warning popup
- Bound 도달 시 inline absolute popup (위쪽). 2.5s 후 opacity 0 transition → 0.5s 뒤 remove. 클릭 즉시 dismiss.

### CSV export
- 패턴: `dca-down-calculator.tsx` `handleExportCsv()` — BOM (`﻿`) + header + lines → Blob → `<a download>` 트리거 → revoke.
- Filename: `<tool>-<YYYY-MM-DD>.csv`.

### Currency-aware step values
- USD vs KRW에 따라 NumberStepper의 smallStep/bigStep 다르게 (예: dca-down budget USD 100/1000 vs KRW 100k/1M).

### forceFirstShare safety guard (dca-down 전용)
- R1 1주 보장 + budget 초과 시 뒤 회차에서 트림 (역순). 안전 카운터로 무한루프 가드.

### 최대잔여 정수 배분 (dca-down 분할매도)
- 정수 총량(보유 주식수)을 분수 가중치로 N분할하되 합이 정확히 일치해야 할 때.
- `dca-down-calculator.tsx` `allocateShares(total, weights)` — floor 후 잔여분을 소수부 큰 순서로 1씩 분배.
- 매수(현금 floor 배분 + 트림)와 달리 매도는 정수 분할이라 별도 패턴 필요. 가중치 함수 `computeNormalizedWeights`는 매수·매도 공통.

### Color-scheme aware gain/loss
- 값 양수/음수에 따라 `text-[var(--color-gain)]` / `text-[var(--color-loss)]` 적용. ColorSchemeProvider가 CSS 변수 swap.

### Storage abstraction (supp-plan)
- Interface `PersonalScheduleStorage` (`lib/supp-plan/storage/types.ts`) + `LocalStorageScheduleStorage` impl. Singleton `scheduleStorage` export.
- 미래 로그인 도입 시 `D1ScheduleStorage` 새로 만들고 export 한 줄만 교체. 모든 사용처는 interface로 접근.

### Compatibility-window matcher (supp-plan)
- 같은 `state` (예: with-meal) + 시간 ±60분 entries 짝짓기 → `compatibility_rules` (DB) 순회로 룰 매칭. 위장 흡수 1시간 기준.
- 결과는 entry id별로 grouped — view에서 inline 경고 표시.

## Hooks

### useMessages / useLocale — `lib/i18n/provider.tsx`
- `useMessages()` → 현재 locale의 전체 `Messages` 객체. 사용: `const t = useMessages().stockSim;` 또는 `useMessages().feedback`.
- `useLocale()` → `{ locale, setLocale }`. LocaleProvider 필요.

### useCurrency — `components/currency-provider.tsx`
- USD ↔ KRW 변환 + rate 관리. Stock-sim 전용 (provider가 stock-sim 트리에만 wrap).
- 실제로는 layout 전역으로 wrap됨 (`app/layout.tsx`).

### useColorScheme — `components/color-scheme-provider.tsx`
- "kr" / "us" gain/loss 색 매핑. 사용: stock-sim 모든 sub.

## i18n 규칙

- 모든 user-facing 문자열은 `lib/i18n/messages.ts`의 `Messages` 타입에 등록 + ko/en 둘 다 정의.
- Namespace는 도구별로 nested (`stockSim.dcaDown.taxRateLabel` 등). 신규 도구 추가 시 새 namespace.
- 라벨 변경 시 동적 placeholder 치환 (`{n}`, `{max}` 등)은 `.replace()`로.

## D1 / Cloudflare

- D1 binding: `env.DB` (production) / preview env `env.preview.DB`.
- wrangler.jsonc 구조: top-level prod + `env.preview` 블록 (전체 binding 명시 — top-level 상속 안 됨).
- API에서 D1 접근: `getCloudflareContext()` (sync) → `env.DB`. 패턴은 `app/api/feedback/route.ts` 참고.
- API route 파일에 `export const runtime = "edge"` 명시 X — OpenNext 미지원 (Turbopack에서 silent broken bundle). runtime 미명시 = Workers 자동 처리. 상세: BRENNHUB.md § 7.
