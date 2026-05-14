@AGENTS.md

# Push policy

기본: 빌드 통과 + commit 완료 후 자동 push.

예외 (여전히 push 직전 정지):
- 파일/디렉토리 대량 삭제 (tool kill, 폴더 제거 등)
- git history 재작성 (rebase, force push, filter-repo)
- 큰 리팩토링 (대략 5+ 파일 동시 수정 또는 의미 있는 동작 변경)
- 프롬프트에 명시적으로 "push 직전 정지" 표기된 경우
