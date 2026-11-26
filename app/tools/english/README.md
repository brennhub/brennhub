# SCENE LOOP: 유튜브로 영어 공부 (english)

유튜브 영상과 스크립트로 대사 반복 듣기, 받아쓰기, 쉐도잉을 하는 개인용 학습 앱. **dev 전용.**

## 구조

- 앱 본체: `public/english/index.html` — 빌드 없는 단일 HTML 파일(외부 import 없음). 정적 자산으로 `/english/`에서 서빙.
  feat/english 커밋 4dffdc4(claude.ai에서 push)로 들어왔고, 이 레포에서는 내용을 수정하지 않는다.
- 허브 카드: `lib/tools-registry.ts` `english` (category `lifestyle`, `devOnly: true`, `hasPage: true`).
  카드는 `/tools/<slug>`로만 링크되므로 `app/tools/english/page.tsx`가 `guardDevOnly("english")` 후 `/english/`로 리다이렉트만 한다.
- 카드 문구: `lib/i18n/messages.ts` `tools.english` (ko/en). 아이콘은 지정하지 않아 기본 아이콘(Grid3x3) — 공용 `components/hub/tool-card.tsx`를 건드리지 않기 위해.
- 릴리스 노트 없음: dev 전용 도구는 `lib/releases.ts`에 항목을 넣지 않는 기존 관례(flail 등)를 따른다.

## ⚠️ prod 노출 경고

`public/` 아래 파일은 `devOnly` 가드와 상관없이 항상 서빙된다. `devOnly`가 막는 것은 허브 카드와 `/tools/english`뿐이고,
**`public/english/`는 이 브랜치가 main에 들어가는 순간 brennhub.com/english/에 그대로 공개된다.**
→ **feat/english는 Brenn의 명시적 승인 없이 main에 머지하지 않는다.**

## prod 출시 차단 요소

- 앱 화면 안에 "AI"라는 단어가 쓰인다. BrennHub UI 원칙("AI"는 어디서도 노출 X)에 어긋나므로 prod 출시 전 문구 정리 필요.
- 위 `public/` 노출 문제 — prod로 낼 때는 dev 전용 가드가 실제로 걸리는 경로로 옮기거나 정적 파일 노출 범위를 따로 정해야 한다.

## 관련

- `public/english/youtube-test.html` — 유튜브 임베드 재생 확인용 테스트 페이지(dev). 이 도구와 별개이며 건드리지 않는다.
