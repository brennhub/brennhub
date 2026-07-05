# Backlog — arcade

## 다음 (batch 12+)
- 나머지 5종 이식: **flail · circ · repel · lure · sing** (각각 `lib/arcade/games/<id>.ts` + index 한 줄, 엔진 수정 0).
- selector 탭 UI 다듬기 (2종 이상 되면 자동 노출되는 버튼 행 → 탭/캐러셀로).

## 개선 여지
- 사이트 `.dark` 토큰을 캔버스에 반영 (현재 게임은 자체 다크 팔레트 고정 — 라이트 테마에서도 검은 무대). 범위: 후속.
- 캔버스 텍스트 i18n (현재 in-game 텍스트는 영어 고정). tool 메타만 ko/en.
- 하이스코어 영속 (현재 `S.best`는 모듈 수명 동안만 유지, 새로고침 시 초기화).
- window keydown 엣지: 피드백 다이얼로그 등 입력창이 arcade 위에 열린 채 플레이 중 F/Space 입력 시 게임이 가로챌 수 있음(shooter와 동일 기존 패턴). 필요 시 엔진 onKeyDown에서 editable target 무시 가드 추가 검토.
