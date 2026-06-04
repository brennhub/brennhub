/**
 * 토큰화 + 조사 제거 (기획서 §3.1 / C-1, §3.2).
 * 결정론적 — 동일 입력 = 동일 출력. 형태소 분석기·AI 없음.
 */

import { KO_JOSA, KO_JOSA_OVERSTRIP } from "./stopwords.ko";

const HANGUL = /[가-힣]/;
const LATIN = /[a-zA-Z]/;
const HANGUL_GLOBAL = /[가-힣]/g;

/** 토큰 분리 기준: 공백 + 구두점. 한글·영문·숫자 런은 붙여서 보존. */
const SPLIT_RE =
  /[\s.,!?;:"'`()[\]{}<>«»“”‘’「」『』【】·…∙•‥—–\-_/\\|=+*~^@#$%&★☆▶◀▲▼○●◎□■△▽\n\r\t]+/;

/** 조사를 길이 내림차순 정렬 — longest-match 보장 ("으로"를 "으"+"로"로 쪼개지 않음). */
const JOSA_DESC = [...KO_JOSA].sort((a, b) => b.length - a.length);

export function hasHangul(s: string): boolean {
  return HANGUL.test(s);
}

export function hasLatin(s: string): boolean {
  return LATIN.test(s);
}

function countHangul(s: string): number {
  const m = s.match(HANGUL_GLOBAL);
  return m ? m.length : 0;
}

/**
 * 조사 제거 — longest-match + 과도제거 가드.
 *
 * 가장 긴 조사부터 시도하되, 떼고 남는 어간의 한글 음절이 2개 미만이면
 * 그 조사는 건너뛴다. 어느 조사로도 유효한 어간이 안 나오면 원형 보존.
 *   - "회의" → "의" 떼면 "회"(1음절) → 가드 → 원형 "회의" 유지
 *   - "정보를" → "를" 떼면 "정보"(2음절) → "정보"
 *   - "수로" → "로" 떼면 "수"(1음절) → 가드 → 원형 "수로" 유지
 * 의심스러우면 원형 보존 (과도제거 < 미제거, brennhub 결정론·안전 우선).
 *
 * 어간 유효성:
 *   - 한글 ≥2음절, 또는
 *   - 영문·숫자 포함 (어근이 순수 한글 명사가 아니므로 뒤 한글은 조사로 본다)
 * 영문/숫자 어근이면 한글 음절 수와 무관하게 조사를 떼어, 스택 조사도 반복 제거:
 *   "gd에→gd", "70과→70", "preload만으로" → "만"(어근 latin, 유효) → "preload".
 * 영문 없는 한글 1음절 어근("회의"→"회", "수로"→"수")은 가드로 원형 보존.
 */
function stemValid(stem: string): boolean {
  if (countHangul(stem) >= 2) return true;
  if (/[a-zA-Z0-9]/.test(stem)) return true;
  return false;
}

export function stripJosa(token: string): string {
  let cur = token;
  // 한글이 남아있는 동안만 조사 후보가 있다 (조사는 한글). 한 번 제거할 때마다 재시도.
  while (hasHangul(cur)) {
    let stripped = false;
    for (const josa of JOSA_DESC) {
      if (cur.length > josa.length && cur.endsWith(josa)) {
        const stem = cur.slice(0, -josa.length);
        // 긴 격·보조사(충돌 0)는 어간 1음절이어도 분리 (등에서→등). 그 외는 과도제거 가드.
        if (stemValid(stem) || KO_JOSA_OVERSTRIP.has(josa)) {
          cur = stem;
          stripped = true;
          break;
        }
        // 이 조사는 어간을 너무 깎음 — 더 짧은 조사 시도
      }
    }
    if (!stripped) break;
  }
  return cur;
}

/** 텍스트 → 토큰 배열 (구두점·공백 분리, 빈 토큰 제거). */
export function splitTokens(text: string): string[] {
  return text
    .split(SPLIT_RE)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** dedup·비교용 정규화: 영문 소문자화 + 트림. 한글은 그대로. */
export function normalizeKey(token: string): string {
  return token.trim().toLowerCase();
}
