/**
 * 이름 추천 알고리즘.
 *
 * 입력: 성씨 한자/획수, 용신/기신, 이름 길이.
 * 출력: 점수 내림차순 후보.
 *
 * 점수 가중치:
 *   - 오행 점수 (40%): 한자 오행이 용신이면 +50/글자, 기신이면 -20/글자.
 *   - 81수리 점수 (35%): calculateSurie totalScore 그대로.
 *   - 발음오행 점수 (25%): 초성 오행이 용신이면 +50/글자, 기신이면 -10/글자.
 *   각 점수 0-100 클램프 후 가중 합산 → 정수 반올림.
 */

import { calculateSurie } from "./surie";

// ───────────────────────── 발음오행 ─────────────────────────

export const SOUND_OHAENG: Record<string, string> = {
  ㄱ: "목",
  ㅋ: "목",
  ㄴ: "화",
  ㄷ: "화",
  ㄹ: "화",
  ㅌ: "화",
  ㅇ: "토",
  ㅎ: "토",
  ㅅ: "금",
  ㅈ: "금",
  ㅊ: "금",
  ㅁ: "수",
  ㅂ: "수",
  ㅍ: "수",
};

// 유니코드 초성 19개 (쌍자음 포함, 매핑 시 평음으로 normalize)
const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const TENSE_TO_PLAIN: Record<string, string> = {
  ㄲ: "ㄱ",
  ㄸ: "ㄷ",
  ㅃ: "ㅂ",
  ㅆ: "ㅅ",
  ㅉ: "ㅈ",
};

/**
 * 한글 음절의 초성 추출.
 * 공식: Math.floor((code - 0xAC00) / 28 / 21).
 * 한글이 아니면 null.
 */
export function getInitialConsonant(hangeul: string): string | null {
  if (!hangeul) return null;
  const code = hangeul.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const idx = Math.floor((code - 0xac00) / 28 / 21);
  const c = CHOSEONG[idx];
  return TENSE_TO_PLAIN[c] ?? c;
}

export function getSoundOhaeng(hangeul: string): string | null {
  const c = getInitialConsonant(hangeul);
  if (!c) return null;
  return SOUND_OHAENG[c] ?? null;
}

// ───────────────────────── 타입 ─────────────────────────

export interface HanjaEntry {
  character: string;
  hangeul: string;
  stroke: number;
  ohaeng: string;
  meaning: string;
  frequency: number;
}

export interface NameCandidate {
  hanja: string;
  hangeul: string;
  strokes: number[];
  ohaengList: string[];
  soundOhaengList: string[];
  surieScore: number;
  ohaengScore: number;
  soundScore: number;
  totalScore: number;
  breakdown: string;
}

export interface NameRecommendOptions {
  sungHanja: string;
  sungStroke: number;
  yongsin: string[];
  gisin: string[];
  nameLength: 1 | 2;
  topN: number;
  excludeChars?: string[];
  db: HanjaEntry[];
}

// ───────────────────────── 점수 계산 ─────────────────────────

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function calcOhaengScore(
  chars: HanjaEntry[],
  yongsin: string[],
  gisin: string[],
): number {
  let s = 0;
  for (const c of chars) {
    if (yongsin.includes(c.ohaeng)) s += 50;
    if (gisin.includes(c.ohaeng)) s -= 20;
  }
  return clamp100(s);
}

function calcSoundScore(
  soundOhaengs: (string | null)[],
  yongsin: string[],
  gisin: string[],
): number {
  let s = 0;
  for (const so of soundOhaengs) {
    if (!so) continue;
    if (yongsin.includes(so)) s += 50;
    if (gisin.includes(so)) s -= 10;
  }
  return clamp100(s);
}

// ───────────────────────── 메인 ─────────────────────────

function makeCandidate(
  chars: HanjaEntry[],
  options: NameRecommendOptions,
): NameCandidate {
  const hanja = chars.map((c) => c.character).join("");
  const hangeul = chars.map((c) => c.hangeul).join("");
  const strokes = chars.map((c) => c.stroke);
  const ohaengList = chars.map((c) => c.ohaeng);
  const soundOhaengList = chars.map((c) => getSoundOhaeng(c.hangeul) ?? "");

  const surie = calculateSurie(
    options.sungStroke,
    strokes[0],
    strokes[1] ?? undefined,
  );
  const surieScore = surie.totalScore;

  const ohaengScore = calcOhaengScore(chars, options.yongsin, options.gisin);
  const soundScore = calcSoundScore(
    soundOhaengList,
    options.yongsin,
    options.gisin,
  );

  const totalScore = Math.round(
    ohaengScore * 0.4 + surieScore * 0.35 + soundScore * 0.25,
  );

  const breakdown = `오행${Math.round(ohaengScore * 0.4)}+수리${Math.round(
    surieScore * 0.35,
  )}+발음${Math.round(soundScore * 0.25)}=${totalScore}`;

  return {
    hanja,
    hangeul,
    strokes,
    ohaengList,
    soundOhaengList,
    surieScore,
    ohaengScore,
    soundScore,
    totalScore,
    breakdown,
  };
}

export function recommendNames(
  options: NameRecommendOptions,
): NameCandidate[] {
  // 1. inname_ok 필터 (필드 없으면 통과)
  const dbFiltered = options.db.filter(
    (h: HanjaEntry & { inname_ok?: number }) =>
      h.inname_ok === undefined || h.inname_ok === 1,
  );

  // 2. excludeChars 제거
  const excludeSet = new Set(options.excludeChars ?? []);
  const usable = dbFiltered.filter((h) => !excludeSet.has(h.character));

  // 3-4. 조합 생성
  const candidates: NameCandidate[] = [];
  if (options.nameLength === 1) {
    for (const c of usable) {
      candidates.push(makeCandidate([c], options));
    }
  } else {
    for (let i = 0; i < usable.length; i++) {
      for (let j = 0; j < usable.length; j++) {
        if (i === j) continue; // 같은 글자 중복 제외
        candidates.push(makeCandidate([usable[i], usable[j]], options));
      }
    }
  }

  // 5-6. 정렬
  candidates.sort((a, b) => b.totalScore - a.totalScore);

  // 7. topN
  return candidates.slice(0, options.topN);
}

// ───────────────────────── 검증 (파일 직접 실행 시) ─────────────────────────

if (
  typeof process !== "undefined" &&
  process.argv[1]?.replace(/\\/g, "/").includes("names")
) {
  // 시드 25자 (migrations/002_hanja_seed.sql 와 동일)
  const seed: HanjaEntry[] = [
    { character: "林", hangeul: "림", stroke: 8, ohaeng: "목", meaning: "수풀", frequency: 5 },
    { character: "森", hangeul: "삼", stroke: 12, ohaeng: "목", meaning: "빽빽할/숲", frequency: 4 },
    { character: "樹", hangeul: "수", stroke: 16, ohaeng: "목", meaning: "나무", frequency: 4 },
    { character: "棟", hangeul: "동", stroke: 12, ohaeng: "목", meaning: "마룻대", frequency: 3 },
    { character: "春", hangeul: "춘", stroke: 9, ohaeng: "목", meaning: "봄", frequency: 5 },
    { character: "明", hangeul: "명", stroke: 8, ohaeng: "화", meaning: "밝을", frequency: 5 },
    { character: "炳", hangeul: "병", stroke: 9, ohaeng: "화", meaning: "불꽃/밝을", frequency: 4 },
    { character: "燁", hangeul: "엽", stroke: 16, ohaeng: "화", meaning: "빛날", frequency: 3 },
    { character: "煥", hangeul: "환", stroke: 13, ohaeng: "화", meaning: "빛날", frequency: 4 },
    { character: "熙", hangeul: "희", stroke: 13, ohaeng: "화", meaning: "빛날/기뻐할", frequency: 5 },
    { character: "美", hangeul: "미", stroke: 9, ohaeng: "토", meaning: "아름다울", frequency: 5 },
    { character: "地", hangeul: "지", stroke: 6, ohaeng: "토", meaning: "땅", frequency: 3 },
    { character: "城", hangeul: "성", stroke: 10, ohaeng: "토", meaning: "성/재", frequency: 4 },
    { character: "培", hangeul: "배", stroke: 11, ohaeng: "토", meaning: "북돋울", frequency: 4 },
    { character: "基", hangeul: "기", stroke: 11, ohaeng: "토", meaning: "터", frequency: 4 },
    { character: "鎭", hangeul: "진", stroke: 18, ohaeng: "금", meaning: "진압할", frequency: 4 },
    { character: "銀", hangeul: "은", stroke: 14, ohaeng: "금", meaning: "은", frequency: 4 },
    { character: "鉉", hangeul: "현", stroke: 13, ohaeng: "금", meaning: "솥귀", frequency: 4 },
    { character: "錦", hangeul: "금", stroke: 16, ohaeng: "금", meaning: "비단", frequency: 4 },
    { character: "鈞", hangeul: "균", stroke: 12, ohaeng: "금", meaning: "서른 근/공평", frequency: 3 },
    { character: "浩", hangeul: "호", stroke: 11, ohaeng: "수", meaning: "넓을", frequency: 5 },
    { character: "海", hangeul: "해", stroke: 11, ohaeng: "수", meaning: "바다", frequency: 5 },
    { character: "江", hangeul: "강", stroke: 7, ohaeng: "수", meaning: "강", frequency: 4 },
    { character: "泉", hangeul: "천", stroke: 9, ohaeng: "수", meaning: "샘", frequency: 4 },
    { character: "潤", hangeul: "윤", stroke: 16, ohaeng: "수", meaning: "윤택할", frequency: 5 },
  ];

  const result = recommendNames({
    sungHanja: "林",
    sungStroke: 8,
    yongsin: ["수"],
    gisin: ["금"],
    nameLength: 2,
    topN: 3,
    db: seed,
  });

  console.log("입력: 성씨 林(8) / 용신=[수] / 기신=[금] / nameLength=2 / topN=3");
  console.log("");
  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    console.log(
      `${i + 1}. ${c.hanja} (${c.hangeul})  획수[${c.strokes.join(",")}]  오행[${c.ohaengList.join(
        ",",
      )}]  발음[${c.soundOhaengList.join(",")}]`,
    );
    console.log(
      `   ohaeng=${c.ohaengScore}  surie=${c.surieScore}  sound=${c.soundScore}  → ${c.breakdown}`,
    );
  }
}
