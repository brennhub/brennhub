# 주식 시뮬레이터 Changelog

주요 결정 / 이정표 (Task 단위 요약).

## 2026-05-14
- 초기 구축 — **Tab 1 평단가 계산기** (cost-basis).
- **Tab 2 배당 계산기** 추가. 이후 yield-based로 리팩토링 + 월별 현금흐름 projection.
- DRIP (배당 재투자) 모델링 + 월별 상세 표.
- 배당 탭 UX 폴리시 — number format, DRIP 라벨, 차트 영역 + 범례, 도움말 섹션, CSV export.
- 차트 시각화 — 범례 아이콘, 티커별 stacked colors, X축 연도 라벨.
- 종합 업데이트 — X축 ticks, tooltip 필터, period input, yield 컬럼, reset, 티커별 카드.

## 2026-05-15
- **Tab 3 분할매수 (DCA-down) 계산기** (Phase A) 추가. 이후 1차 모델 정렬 (1주 기본, target price 컬럼, next-buy indicator).
- 분할매수 기본을 **Martingale (2x doubling)** 으로 변경.
- DCA-down 정제 — 컬럼/행 클릭 완료/N cap/0주 경고. ColorScheme provider와 decouple.
- Profit 컬럼 + 커스텀 stepper (N ↔ drop 동기화) + 색상 범례.
- Stepper N 양방향 동기화 + N_MAX cap 해제 + 리셋 버튼 + 색상 토글 라벨.
- **입력 모델 재설계** — `dropInterval` → `finalDrop` (독립 입력)로 변경. 직후 양방향 동기화 부재가 UX 후퇴라 판단하고 **revert** — `dropInterval` 복귀 + big/small step + 통화 시스템 + force-first-share 옵션.
- Stepper clamp/smart-round, 다중 rename, 세금 입력, CSV export, 통화 환율 통합.
- 세금 UI 재설계 (단기/장기 selector + tax row), manual 환율, stepper warning popup, CSV locale headers.

## 2026-05-16
- CSV BOM, manual rate 소수점 입력, 라벨 단순화, popup fade-out, N 빈 default, dynamic N max, 입력 단위/형식.
- DCA Down + i18n 메시지 업데이트.
- **Invalid 입력 시에도 카드 구조 유지** — value만 "—" swap. 점멸 방지.
- 세금 단기/장기 토글 off 허용 + 가중치 0-100 대칭 매핑 (0 = Martingale, 50 = Equal, 100 = R1 only).
- (i18n) 가중치 균형 hint 라벨 정제.

## 2026-05-21
- **분할매도 탭 추가** — 4번째 탭 "분할매도" (`split-sell-calculator.tsx` + `split-sell-detail.tsx`). 분할매수 탭의 1:1 미러 — 매수↔매도, 하락↔상승. 보유 주식수 · 현재가 · 매도 횟수 · 상승율 · 평단가를 직접 입력하면 가격이 회차별 상승하며 회차별 매도가 / 매도금 / 실현손익을 계산. 가중치(Martingale 2x / 0~100 균형) · 세금 · 시작가 보장은 분할매수와 동일 동작. 보유 주식수는 최대잔여 정수 배분으로 회차 분배(합 정확 일치). 회차 완료 마킹 + CSV. localStorage 키 `brennhub:stock-sim:split-sell`.
  - 설계 경위: 최초엔 분할매수 탭 내 토글로 통합을 시도했으나, 분할매도가 매수 계획(예산 · 하락율 등)에 종속돼 "순수 분할매도"가 불가능 — 전용 탭으로 재설계.

## 2026-05-22
- **분할매도 정제** — ① 매도가 기준점 토글 추가(평단가 / 현재가, 기본 평단가). 평단가 기준 선택 시 현재가 입력 비활성. 매도가 = 기준 × (1 + 상승률 × m). ② "시작가 매도 보장" 토글 제거 + 매도가 공식을 m=1..M로 변경 — 1회차부터 상승률 적용(테이블 1회차 상승률 컬럼이 0%가 아닌 첫 상승률값). 최대잔여 정수 배분은 유지. ③ (i18n) 분할매도 "상승율"→"상승률", 분할매수 "하락율"→"하락률" 맞춤법 수정 (ko).
- **분할매도 입력란 정리** — 입력란을 "매도가 기준" 토글에 종속 배치. 평단가 기준 → 평단가 입력 1개(현재가 숨김). 현재가 기준 → 현재가 + 평단가 2개(현재가가 위), 평단가에 "실현손익 계산에 사용됩니다" 보조 힌트 표시. 안 쓰는 현재가 입력을 비활성(dim) 대신 미렌더로 전환. 계산 · valid · localStorage · 매도가 공식 무변경.
