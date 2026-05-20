# 축구 베스트 일레븐 만들기 — `/tools/lineup-builder`

> UI 표시명은 "축구 베스트 일레븐 만들기" (en "Football Best XI Builder"). 코드 식별자(slug `lineup-builder`, registry id, 파일 경로)는 불변.

축구 베스트 일레븐(11명) 라인업을 시각적으로 구성하고 PNG로 다운로드하는 도구. 포메이션 자동 배치 + 드래그 미세 조정 + 인라인 편집(이름·등번호).

## 목적

축구 팬·코치·동호회 운영자가 자신만의 베스트 일레븐 스쿼드를 만들고 SNS에 공유할 수 있도록, 직관적이고 빠른 작성 흐름을 제공.

출처: 외부 기획서 § 1 (Brenn 수령, brennhub 외부 기획서 필터 7개 적용).

## 주요 기능

1. **축구 경기장 시각화** — 반응형 (aspect-ratio 3/4), 잔디 패턴 + 라인, 외부 이미지 의존성 없음(순수 CSS).
2. **포메이션 8종 자동 배치** — 4-4-2 / 4-3-3 / 3-5-2 / 4-2-3-1 / 4-1-4-1 / 3-4-3 / 5-3-2 / 4-3-2-1.
3. **선수 마커 드래그 + 인라인 편집** — Pointer Events(mouse·touch·pen), 클릭 시 이름·등번호·포지션·주장 편집.
4. **세부 포지션 15종** — 마커에 포지션 코드 표시 (Role 4종과 별개로 공존).
5. **팀 정보** — 팀명·감독 입력(캡처 헤더 반영), 팀 색상 8종, 주장(C 배지) 1명.
6. **PNG 다운로드** — modern-screenshot으로 캡처 영역 → `${팀명}-squad.png` (팀명 없으면 `brennhub-squad.png`).

확장 계획 (MVP 검증 후, 별도 task): BACKLOG.md "2단계 확장" 참조.

## 기술 스택 (brennhub 환경 재설계)

| 원본 기획서 | brennhub 적용 |
|---|---|
| Bootstrap 5.3 | Tailwind v4 (CSS-first) |
| Vanilla JS | React Client Component (`"use client"`) |
| html2canvas CDN | `modern-screenshot` npm (foreignObject 캡처 — Tailwind v4 모던 색 함수 호환) |
| 단일 `index.html` | Next.js App Router (`app/tools/lineup-builder/page.tsx` + `client-shell.tsx`) |

다른 도구(stock-sim, supp-plan)와 동일 스택. 별도 백엔드 운영 X — 클라이언트 사이드 only.

## 데이터 구조

```typescript
type Role = "GK" | "DF" | "MF" | "FW";   // 색·그룹용

type PositionCode =                       // 세부 포지션 15종, 표시·편집용
  | "GK" | "CB" | "LB" | "RB" | "LWB" | "RWB"
  | "DM" | "CM" | "AM" | "LM" | "RM"
  | "CF" | "SS" | "LW" | "RW";

type Player = {
  id: number;            // 1-11
  role: Role;
  position: PositionCode;
  top: number;           // % from top of pitch (0-100)
  left: number;          // % from left of pitch (0-100)
  name: string;
  number: number;
};

type FormationId =
  | "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1"
  | "4-1-4-1" | "3-4-3" | "5-3-2" | "4-3-2-1";

type Formation = {
  id: FormationId;
  players: Player[];   // 11명. 표시명은 i18n lineupBuilder.formations[id]
};
```

좌표 값: 포메이션 8종 모두 작업 지시서에서 확정 수령, `lib/lineup-builder/formations.ts`에 transcribe 완료. 기본 포메이션은 `4-3-3`.

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
