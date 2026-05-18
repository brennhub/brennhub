# 이메일 발송 진단기 Changelog

주요 결정 / 이정표 (commit 단위 1-3줄 요약).

## 2026-05-12
- 초기 구축 — v0 DNS-only 진단기 (MX/SPF/DMARC/PTR 조회).
- DoH edge case 처리 + record별 오류 격리.
- AI 분석 레이어 추가 (provider abstraction). 이후 UI에서 "AI" 브랜딩 제거 — 사용자 입장에선 단순 진단 도구로 노출.
