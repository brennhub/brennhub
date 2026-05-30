/**
 * tag-it 한계값 단일 소스.
 * UI·검증·다운로드 어디서든 이 상수만 참조 (기획서 §A, task-prompt §3.6/§3.7).
 * 숫자 변경은 여기 한 곳에서만.
 */

export const TAG_IT_LIMITS = {
  /** 한 번에 올릴 수 있는 최대 파일 수 */
  maxFiles: 5,
  /** 개당 최대 바이트 (8MB) */
  maxFileBytes: 8 * 1024 * 1024,
  /** 총합 최대 바이트 (15MB) — 개당·총합 이중 제한 */
  maxTotalBytes: 15 * 1024 * 1024,
  /** 점진 노출 시 처음에 보여줄 칩 수 */
  defaultVisibleChips: 30,
  /** 파일당 기록 가능한 태그 상한 (core.xml keywords 현실 상한) */
  maxTagsPerFile: 50,
  /** 태그 1개 글자수 상한 */
  maxTagChars: 30,
} as const;
