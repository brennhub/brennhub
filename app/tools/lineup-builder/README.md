# 라인업 빌더 — `/tools/lineup-builder`

축구 베스트 일레븐(11명) 라인업을 시각적으로 구성하고 PNG로 다운로드하는 도구. 포메이션 자동 배치 + 드래그 미세 조정 + 인라인 편집(이름·등번호).

## 목적

축구 팬·코치·동호회 운영자가 자신만의 베스트 일레븐 스쿼드를 만들고 SNS에 공유할 수 있도록, 직관적이고 빠른 작성 흐름을 제공.

출처: 외부 기획서 § 1 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## 주요 기능

1. **축구 경기장 시각화** — 반응형 (aspect-ratio 3/4), 잔디 패턴 + 라인, 외부 이미지 의존성 없음(순수 CSS).
2. **포메이션 4종 자동 배치** — 4-4-2, 4-3-3, 3-5-2, 4-2-3-1.
3. **선수 마커 드래그 + 인라인 편집** — mouse + touch 모두 지원, 클릭 시 이름·등번호 편집.
4. **PNG 다운로드** — html2canvas로 경기장 영역 캡처 → `brennhub-squad.png`.

확장 계획 (MVP 검증 후, 별도 task):
- 6.1 localStorage 스쿼드 히스토리
- 6.2 평점 / 스탯 오버레이
- 6.3 테마 + 유니폼 커스텀

## 기술 스택 (brennhub 환경 재설계)

| 원본 기획서 | brennhub 적용 |
|---|---|
| Bootstrap 5.3 | Tailwind v4 (CSS-first) |
| Vanilla JS | React Client Component (`"use client"`) |
| html2canvas CDN | `html2canvas` npm 패키지 (v1.4.1+) |
| 단일 `index.html` | Next.js App Router (`app/tools/lineup-builder/page.tsx` + `client-shell.tsx`) |

다른 도구(stock-sim, supp-plan)와 동일 스택. 별도 백엔드 운영 X — 클라이언트 사이드 only.

## 데이터 구조

```typescript
type Role = "GK" | "DF" | "MF" | "FW";

type Player = {
  id: number;          // 1-11
  role: Role;
  top: number;         // % from top of pitch (0-100)
  left: number;        // % from left of pitch (0-100)
  name: string;
  number: number;
};

type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

type Formation = {
  id: FormationId;
  players: Player[];   // 11명. 표시명은 i18n lineupBuilder.formations[id]
};
```

좌표 값: 4종(4-4-2 / 4-3-3 / 3-5-2 / 4-2-3-1) 모두 Task A 지시서에서 확정 수령, `lib/lineup-builder/formations.ts`에 transcribe 완료.

## 파일 구조

```
app/tools/lineup-builder/
  README.md             # 본 문서
  BACKLOG.md            # 작업 계획 + 확장 항목
  CHANGELOG.md
  page.tsx              # Server Component shell
  client-shell.tsx      # Client wrapper (상태·레이아웃·캡처)
lib/lineup-builder/
  types.ts              # Role / FormationId / Player / Formation
  formations.ts         # 포메이션 4종 좌표
components/lineup-builder/
  pitch.tsx             # 경기장 + 마커 컨테이너
  player-marker.tsx     # 단일 선수 마커 (pointer 드래그)
  formation-select.tsx  # 포메이션 셀렉트
  control-panel.tsx     # 포메이션 + 다운로드 + 초기화
  edit-dialog.tsx       # 이름·등번호 편집 모달
```

> `lib/`·`components/`는 루트 하위 (`lib/supp-plan/` 패턴과 일관). 도구 폴더 안에는 문서 3종 + page/client-shell만.

상세 체크리스트: [BACKLOG.md](./BACKLOG.md). 변경 이력: [CHANGELOG.md](./CHANGELOG.md).

## 출처

- 외부 기획서 § 1-6 (Brenn 수령, 2026-05-19).
- brennhub 외부 기획서 필터 7개 적용 결과: 가격/광고/별도 백엔드 모두 미해당 → MVP scope에 영향 없음. 프론트엔드 스택만 재설계.
- 등록 commit: `f261651 feat(lineup-builder): add coming-soon placeholder`.
