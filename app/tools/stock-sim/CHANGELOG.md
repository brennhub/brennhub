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
