# 타로 테이블 — 작업 인수인계 (cross-device)

> **용도**: 다른 기기에서 받아 이어 작업할 때의 단일 진입점. Task 3 완료·main 머지 후 이 파일은 삭제한다.
> 명세 정본은 [README.md](./README.md), 결정 기록은 [CHANGELOG.md](./CHANGELOG.md), 보류 항목은 [BACKLOG.md](./BACKLOG.md).

## 진행 상태 (2026-06-11 기준)

| Task | 상태 | 비고 |
|---|---|---|
| Task 1 — 스캐폴드 + 카드 데이터 | ✅ 완료 | feat/tarot → dev 머지·배포 확인 (0.1.0) |
| Task 2 — 의식 플로우 S0~S7 | ✅ 완료 | feat/tarot → dev 머지·배포 확인 (0.2.0). 편집장 dev 검수 완료 (2026-06-11) |
| Task 2.5 — 단층 정정 + 검수 피드백 | ✅ 완료 (0.2.1) | 정/역 단층 전환(2층 XOR 폐기·편집장 확정) + S3 스월 + S5 스프레드 선택 + SealBadge. dev 배포·스모크 확인 |
| Task 3 — S8 리딩·저장·공유·사전 열람 | ✅ 코드 완료 (0.3.0) | S8·검증 토글·localStorage 저장·공유 PNG·/tools/tarot/cards. **push·dev 검수 대기** |
| main 머지 | ⬜ | **사용자 dev 확인 후에만.** `lib/releases.ts` entry 필수 (pre-push hook이 강제) — id 후보 `tarot-launch` |

**Task 2 검수 결과** (2026-06-11, dev.brennhub.com/tools/tarot): 편집장이 **정/역을 단층으로 확정** — "고른 방향이 세 장 전체에 그대로 적용"이 올바른 명세. 기존 2층(숨은 비트 × 선택 XOR) 명세·불변식은 Task 2.5에서 정정.

## 재개 절차

1. `git checkout feat/tarot && git merge main` (feat는 도구당 long-lived 1개)
2. 먼저 읽기: 본 폴더 README.md(와이어 정본·정/역 단층·커밋-리빌·봉인 payload 포맷) + 루트 PATTERNS.md(localStorage hydrate/persist/schemaVersion)
3. plan 제시 → 승인 후 구현. 논리적 commit 분할. `npm run build` 통과 + commit까지 진행하고 **push 직전 정지** — 사용자 확인 후 push
4. dev 머지·main 머지는 사용자 지시로만

## 구현 시 핵심 불변식 (변경 금지)

- **봉인 payload 정본**: `tarot-seal-v1|order:<22 ids>|nonce:<32hex>` → SHA-256 hex 64자. S8 '검증' 토글은 이 문자열을 재구성·재해시한다 — 포맷 변경 = 검증 깨짐. (`lib/tarot/ritual.ts buildSealPayload`. 2026-06-11 단층 정정으로 bits 필드 제거)
- **카드 방향** = S6 `userChoice` 단일 소스 — 단층 (2026-06-11 편집장 확정, 2층 XOR 폐기).
- 비가역·전환 가드의 단일 권위는 `lib/tarot/ritual-state.ts` 리듀서.
- 임시 결과 화면 `components/stages/result-temp.tsx`를 S8로 교체. entry의 `?debug=1` 덱 그리드는 S8 완성 시 제거 가능.

## Task 3 프롬프트 (원본: tarot-cc-tasks.md — 그대로 투입)

```
[작업: 타로 테이블 — Task 3/3: 리딩 + 저장 + 공유 + 사전 열람]

먼저 읽기: app/tools/tarot/README.md, PATTERNS.md(localStorage hydrate/persist/schemaVersion 패턴). 시작 전 feat/tarot에서 git merge main.

범위:
1. S8 리딩 화면: 상단에 사용자가 적은 질문 원문(따옴표) + 도메인 뱃지(대가의 회수 — 질문이 리딩의 제목). 카드별 섹션: essence(항상 표시) → 선택 도메인 매칭 키워드 강조 + gloss(도메인 칩과 동일 색으로 시각 연결) → 비매칭 키워드는 접힘('전체 키워드 보기' 토글 — 숨기지 않되 강조만) → 매칭 키워드 0개면 mute 정직 문구("이 카드는 [도메인]에 직접 닿지 않아요" + essence) → 'Waite 원문 보기' 토글(영문 원문 그대로). '검증' 접힌 토글: S4 봉인 해시의 원본(카드 순서 + nonce + pickedIndices)을 공개해 커밋-리빌 검증 가능하게 — 해시 payload는 순서+nonce, pickedIndices는 스프레드 선택 위치 표시용. 같은 리딩 재뽑기 버튼 없음 — '새 리딩'은 S0(그라운딩)부터.
2. 저장: 마지막 리딩 1건 localStorage(hydrate/persist/schemaVersion — PATTERNS.md 패턴 그대로). 재방문 시 S0에 '지난 리딩 보기' 진입점. 질문 포함 저장 — 기기 내에만.
3. 공유 이미지: canvas.toDataURL로 직접 그리기 — html2canvas 사용 금지(Tailwind v4 + Lightning CSS 환경에서 빈 PNG, lineup-builder에서 확인된 제약). 구성: 카드 3장(타이포 렌더) + 이름 + 방향 + 도구명 + URL. 기본값 질문 미포함.
4. 사전 열람: app/tools/tarot/cards/page.tsx — 22장 브라우즈(server component, cards 데이터 렌더). 카드별 정/역 essence·키워드(도메인 태그)·gloss·Waite 원문. S0와 S8에서 링크 연결. 투명성 증명 + SEO 자산.
5. 마감: 다크/라이트 양 모드 점검, 모바일 세로 점검, 도구 README/CHANGELOG 갱신(버전·결정 기록).

진행: 코드 변경 전 plan 제시 → 승인 후 구현. 논리적 commit 분할(예: S8 / 저장 / 공유 이미지 / 사전 열람 / 마감). npm run build 통과 + commit까지 진행하고 push 직전 정지 — 사용자 확인 후 push. push 승인 후 feat→dev 머지·push 여부는 사용자 지시에 따름(dev.brennhub.com 확인용). main 머지는 사용자가 dev 확인을 마친 뒤 별도 지시로만.
```

## main 머지 체크리스트 (Task 3 + dev 검수 완료 후)

- [ ] `lib/releases.ts`에 entry 추가 — id 예: `tarot-launch`, date = main 머지 예정일, 사용자 언어(개발 용어·"AI" 금지). **dev 머지 시점에 미리 추가해 dev에서 문구 검증**이 정상 흐름
- [ ] pre-push hook 통과 조건: ① releases.ts 변경 ② main range 커밋이 origin/dev에 reachable (feat→dev 선행)
- [ ] 이 TASKS.md 삭제
