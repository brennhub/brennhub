/**
 * brennhub 음령오행(소리오행) — 학파 plug-in 구조.
 *
 * 음령오행 = 한글 자음의 오행. 작명에서 성+이름 자음의 오행 배열이 상생이면
 * 길(吉), 상극이면 흉(凶). C-5-4 `radical-ohaeng.ts` School plug-in 패턴 일관.
 *
 * ── 자음 오행 배속 ─────────────────────────────────────────────
 *   牙音 ㄱㅋ → 木 / 舌音 ㄴㄷㄹㅌ → 火 / 齒音 ㅅㅈㅊ → 金   (3종 비논쟁)
 *   脣音 ㅁㅂㅍ · 喉音 ㅇㅎ → 학파 분기:
 *     · "tongyong"        통용 다수안 = 신경준 『훈민정음운해』(1750) 계열,
 *                         현대 작명 실무 다수. 脣音→水 / 喉音→土.  ← default
 *     · "hunminjeongeum"  훈민정음 해례 제자해 원전(1446). 脣音→土(宮聲) /
 *                         喉音→水(羽聲).
 *   ※ 신경준이 훈민정음 원전을 보지 못한 채 순음·후음 배속을 뒤바꿨고 후대
 *      작명 실무가 이를 다수 계승 — 두 안 모두 실재. 우열 표기 없음.
 *   출처: 김만태 「훈민정음의 제자원리와 역학사상」(철학사상, 2012) /
 *         「자음에서 순음과 후음의 오행 분별」(한국명리성명학회).
 *
 * ── 채점 ruleset (적용 위치 학설) ──────────────────────────────
 *   · "choseong"        A학설 — 초성만으로 상생 평가.            ← default
 *   · "with-jongseong"  B학설 — 초성·종성 연쇄 평가 (받침 브릿지).
 *   · "both"            C학설 — A·B 모두 평가 (두 점수 평균).
 *   받침 브릿지: 이름 초성끼리 상극이어도 앞 글자 종성이 중간 오행이면
 *     상생으로 이어줌 (예: 金剋木 사이에 종성 水 → 金生水·水生木). B/C에서
 *     초성·종성을 한 체인으로 펴면 자연 반영됨.
 *
 * ── 상생/상극 ─────────────────────────────────────────────────
 *   상생: 木生火 火生土 土生金 金生水 水生木
 *   상극: 木克土 土克水 水克火 火克金 金克木
 *   상생/상극의 길흉은 음령오행 이론 팩트. 점수값(RELATION_POINT)은
 *   캘리브레이션 — 풀 분포 측정 후 39-C에서 조정.
 *
 * 향후 확장(별도 evaluator): 발음 음양(모음 양성/음성 조화), 어감.
 */

export type Ohaeng = "목" | "화" | "토" | "금" | "수";

/** 자음 오행 배속 학파. */
export type SoundSchool = "tongyong" | "hunminjeongeum";

/** 채점 적용 위치 학설 (A/B/C). */
export type SoundRuleset = "choseong" | "with-jongseong" | "both";

/** 오행 인접쌍 관계. */
export type OhaengRelation = "상생" | "비화" | "상극";

// ───────────────────────── 상생/상극 ─────────────────────────

/** X生Y — X가 생하는 오행. */
export const OHAENG_GENERATES: Record<Ohaeng, Ohaeng> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

/** X克Y — X가 극하는 오행. */
export const OHAENG_CONTROLS: Record<Ohaeng, Ohaeng> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
};

/**
 * 두 오행의 인접 관계.
 * 같으면 비화, 한쪽이 다른 쪽을 생하면 상생, 그 외(극 관계)는 상극.
 */
export function relateOhaeng(a: Ohaeng, b: Ohaeng): OhaengRelation {
  if (a === b) return "비화";
  if (OHAENG_GENERATES[a] === b || OHAENG_GENERATES[b] === a) return "상생";
  return "상극";
}

/** 관계별 점수 (0~1). 길흉은 이론 팩트, 수치는 캘리브레이션(39-C). */
const RELATION_POINT: Record<OhaengRelation, number> = {
  상생: 1.0,
  비화: 0.5,
  상극: 0.0,
};

// ───────────────────────── 한글 자모 ─────────────────────────

const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const JONGSEONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

/**
 * 자음 → 기본 자음 정규화.
 *   - 쌍자음: 평음으로 (ㄲ→ㄱ 등).
 *   - 겹받침: 표준발음법 대표음으로 (ㄳ→ㄱ, ㄻ→ㅁ 등) — 발음되는 자음 기준.
 */
const CONSONANT_BASE: Record<string, string> = {
  ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ",
  ㄳ: "ㄱ", ㄵ: "ㄴ", ㄶ: "ㄴ", ㄺ: "ㄱ", ㄻ: "ㅁ", ㄼ: "ㄹ",
  ㄽ: "ㄹ", ㄾ: "ㄹ", ㄿ: "ㅂ", ㅀ: "ㄹ", ㅄ: "ㅂ",
};

/** 기본 자음 14종 → 오행 (학파별). 脣音(ㅁㅂㅍ)·喉音(ㅇㅎ)만 분기. */
function buildConsonantTable(school: SoundSchool): Record<string, Ohaeng> {
  const labial: Ohaeng = school === "hunminjeongeum" ? "토" : "수"; // 脣 ㅁㅂㅍ
  const laryngeal: Ohaeng = school === "hunminjeongeum" ? "수" : "토"; // 喉 ㅇㅎ
  return {
    ㄱ: "목", ㅋ: "목", // 牙音
    ㄴ: "화", ㄷ: "화", ㄹ: "화", ㅌ: "화", // 舌音
    ㅅ: "금", ㅈ: "금", ㅊ: "금", // 齒音
    ㅁ: labial, ㅂ: labial, ㅍ: labial, // 脣音
    ㅇ: laryngeal, ㅎ: laryngeal, // 喉音
  };
}

/** 학파별 자음→오행 테이블 (사전 빌드). */
export const CONSONANT_OHAENG: Record<SoundSchool, Record<string, Ohaeng>> = {
  tongyong: buildConsonantTable("tongyong"),
  hunminjeongeum: buildConsonantTable("hunminjeongeum"),
};

/** 자음(쌍자음·겹받침 포함) → 오행. 매핑 불가 시 null. */
function consonantOhaeng(
  consonant: string,
  school: SoundSchool,
): Ohaeng | null {
  const base = CONSONANT_BASE[consonant] ?? consonant;
  return CONSONANT_OHAENG[school][base] ?? null;
}

// ───────────────────────── 음절 분해 ─────────────────────────

export interface SyllableSound {
  syllable: string;
  choseong: string | null;
  jongseong: string | null; // 받침 없으면 null
  choseongOhaeng: Ohaeng | null;
  jongseongOhaeng: Ohaeng | null;
}

/**
 * 한글 음절 1자를 초성/종성 + 각 오행으로 분해.
 * 한글 음절(U+AC00~U+D7A3)이 아니면 전부 null.
 */
export function decomposeSyllable(
  syllable: string,
  school: SoundSchool = "tongyong",
): SyllableSound {
  const code = syllable ? syllable.charCodeAt(0) : NaN;
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) {
    return {
      syllable,
      choseong: null,
      jongseong: null,
      choseongOhaeng: null,
      jongseongOhaeng: null,
    };
  }
  const idx = code - 0xac00;
  const choseong = CHOSEONG[Math.floor(idx / 588)];
  const jongIdx = idx % 28;
  const jongseong = jongIdx === 0 ? null : JONGSEONG[jongIdx];
  return {
    syllable,
    choseong,
    jongseong,
    choseongOhaeng: consonantOhaeng(choseong, school),
    jongseongOhaeng: jongseong ? consonantOhaeng(jongseong, school) : null,
  };
}

// ───────────────────────── 체인 채점 ─────────────────────────

export interface OhaengPair {
  a: Ohaeng;
  b: Ohaeng;
  relation: OhaengRelation;
}

export interface ChainEval {
  chain: Ohaeng[];
  pairs: OhaengPair[];
  score: number; // 0-100
}

/** 오행 체인의 인접쌍 상생/상극 → 0-100 점수. */
function scoreChain(chain: Ohaeng[]): ChainEval {
  const pairs: OhaengPair[] = [];
  for (let i = 0; i + 1 < chain.length; i++) {
    pairs.push({
      a: chain[i],
      b: chain[i + 1],
      relation: relateOhaeng(chain[i], chain[i + 1]),
    });
  }
  // 인접쌍이 없으면(0~1글자) 평가 불가 → 중립 50.
  if (pairs.length === 0) return { chain, pairs, score: 50 };
  const sum = pairs.reduce((s, p) => s + RELATION_POINT[p.relation], 0);
  return { chain, pairs, score: Math.round((sum / pairs.length) * 100) };
}

/** 초성만 이어붙인 체인. */
function choseongChain(parts: SyllableSound[]): Ohaeng[] {
  const chain: Ohaeng[] = [];
  for (const p of parts) {
    if (p.choseongOhaeng) chain.push(p.choseongOhaeng);
  }
  return chain;
}

/**
 * 초성·종성을 음절 순서대로 펼친 체인 (받침 브릿지 반영).
 * 음절마다 [초성, 종성?] — 받침이 두 초성 사이에 끼어 상극을 상생으로 이어줌.
 */
function jongseongChain(parts: SyllableSound[]): Ohaeng[] {
  const chain: Ohaeng[] = [];
  for (const p of parts) {
    if (p.choseongOhaeng) chain.push(p.choseongOhaeng);
    if (p.jongseongOhaeng) chain.push(p.jongseongOhaeng);
  }
  return chain;
}

// ───────────────────────── 메인 ─────────────────────────

export interface SoundOhaengResult {
  score: number; // 0-100 (ruleset 반영 최종)
  school: SoundSchool;
  ruleset: SoundRuleset;
  choseong: ChainEval; // 초성 체인 (항상 계산)
  jongseong?: ChainEval; // 종성 포함 체인 (with-jongseong / both)
  detail: string; // 사람이 읽는 요약
}

export interface SoundOhaengOptions {
  school?: SoundSchool; // default "tongyong"
  ruleset?: SoundRuleset; // default "choseong"
}

function formatChain(ev: ChainEval): string {
  if (ev.chain.length === 0) return "(평가 불가)";
  let s = ev.chain[0];
  for (const p of ev.pairs) s += ` →${p.relation}→ ${p.b}`;
  return `[${s}] ${ev.score}점`;
}

/**
 * 음령오행 평가 — 성+이름 음절열의 자음 오행 상생/상극 채점.
 *
 * @param syllables 한글 음절 배열 (성, 이름1, [이름2] 순).
 * @param options   school(자음 학파) / ruleset(A·B·C 학설).
 */
export function evaluateSoundOhaeng(
  syllables: string[],
  options: SoundOhaengOptions = {},
): SoundOhaengResult {
  const school = options.school ?? "tongyong";
  const ruleset = options.ruleset ?? "choseong";

  const parts = syllables.map((s) => decomposeSyllable(s, school));
  const choseong = scoreChain(choseongChain(parts));

  let jongseong: ChainEval | undefined;
  let score: number;
  if (ruleset === "choseong") {
    score = choseong.score;
  } else {
    jongseong = scoreChain(jongseongChain(parts));
    score =
      ruleset === "with-jongseong"
        ? jongseong.score
        : Math.round((choseong.score + jongseong.score) / 2); // both
  }

  let detail = `[${ruleset}] 초성 ${formatChain(choseong)}`;
  if (jongseong) detail += ` / 종성포함 ${formatChain(jongseong)}`;
  if (ruleset === "both") detail += ` → 평균 ${score}점`;

  return { score, school, ruleset, choseong, jongseong, detail };
}
