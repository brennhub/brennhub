/**
 * 이름 추천 알고리즘.
 *
 * 입력: 성씨 한자/한글/획수, 이름 길이.
 * 출력: 점수 내림차순 후보.
 *
 * 점수 가중치 (음령오행 2단계 재정립):
 *   - 음령오행 (55%): `evaluateSoundOhaeng` — 성+이름 자음 오행 상생/상극 채점.
 *   - 81수리 (45%): `calculateSurie` totalScore.
 *   자원오행(사주 보완)은 recommend route의 SQL `ja_ohaeng IN(yongsin)` 하드
 *   필터로 처리 — 점수 축 아님 (F3 해결: 풀이 이미 걸러져 점수로 또 매기면 무의미).
 *   각 점수 0-100, 가중 합산 → 정수.
 *
 * 상용도(`frequency` 1~5 티어)는 점수 축에 **미가산** (작명 축 오염 회피, 39-C). 두 곳에만:
 *   - 풀 선정: recommend route `ORDER BY frequency DESC` (상용자 우선 풀 — route 책임).
 *   - 동점 tiebreak: 같은 totalScore면 `freqSum`(이름 한자 상용도 합) 높은 후보 우선.
 *   → 흔한 한자가 상위로, 점수 동률에서만 작동 (음령/수리 우열은 불변).
 */

import { calculateSurie } from "./surie";
import { evaluateSoundOhaeng } from "./sound-ohaeng";
import { isExcludedFromRecommend } from "./name-exclude";

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
  stroke: number; // 필획 (Unihan kTotalStrokes) — display
  won_stroke: number; // 원획 (C-4-B 환원법) — 81수리 계산용
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
  soundScore: number;
  totalScore: number;
  freqSum: number; // 이름 한자 상용도(frequency 1~5) 합 — 동점 tiebreak용 (점수 미가산).
  breakdown: string;
}

export interface NameRecommendOptions {
  sungHanja: string;
  sungHangeul: string; // 성씨 한글 — 음령오행 체인의 시작점
  sungStroke: number;
  nameLength: 1 | 2;
  topN: number;
  excludeChars?: string[];
  db: HanjaEntry[];
}

// ───────────────────────── 메인 ─────────────────────────

function makeCandidate(
  chars: HanjaEntry[],
  options: NameRecommendOptions,
): NameCandidate {
  const hanja = chars.map((c) => c.character).join("");
  const hangeul = chars.map((c) => c.hangeul).join("");
  const strokes = chars.map((c) => c.stroke);
  const wonStrokes = chars.map((c) => c.won_stroke);
  const ohaengList = chars.map((c) => c.ohaeng);
  const soundOhaengList = chars.map((c) => getSoundOhaeng(c.hangeul) ?? "");

  // 81수리 — 원획(won_stroke) 기준 (작명 정설, sungStroke도 성씨 원획 전제).
  const surie = calculateSurie(
    options.sungStroke,
    wonStrokes[0],
    wonStrokes[1] ?? undefined,
  );
  const surieScore = surie.totalScore;

  // 음령오행 — 성씨초성 → 이름 초성 자음 오행 상생/상극 (sound-ohaeng.ts, A학설 default).
  const soundScore = evaluateSoundOhaeng([
    options.sungHangeul,
    ...chars.map((c) => c.hangeul),
  ]).score;

  // 가중치 — 음령 55% / 수리 45% (음령오행 2단계 시작값, 최종 캘리브레이션 39-C).
  const soundWeighted = Math.round(soundScore * 0.55);
  const surieWeighted = Math.round(surieScore * 0.45);
  const totalScore = soundWeighted + surieWeighted;
  // 상용도 합 — 동점 tiebreak 전용 (totalScore 미반영). frequency 없으면 0 취급.
  const freqSum = chars.reduce((s, c) => s + (c.frequency ?? 0), 0);
  const breakdown = `음령${soundWeighted}+수리${surieWeighted}=${totalScore}`;

  return {
    hanja,
    hangeul,
    strokes,
    ohaengList,
    soundOhaengList,
    surieScore,
    soundScore,
    totalScore,
    freqSum,
    breakdown,
  };
}

/** 후보 정렬 비교자 — totalScore desc, 동점이면 freqSum desc(상용도 tiebreak). */
function compareCandidate(a: NameCandidate, b: NameCandidate): number {
  return b.totalScore - a.totalScore || b.freqSum - a.freqSum;
}

export function recommendNames(
  options: NameRecommendOptions,
): NameCandidate[] {
  const limit = options.topN;
  if (limit <= 0) return [];

  // 1. inname_ok 필터 (필드 없으면 통과)
  const dbFiltered = options.db.filter(
    (h: HanjaEntry & { inname_ok?: number }) =>
      h.inname_ok === undefined || h.inname_ok === 1,
  );

  // 2. excludeChars + 추천 부적합 제거 — 희귀 블록·의미 불량·블랙리스트 (39-C 품질 가드).
  const excludeSet = new Set(options.excludeChars ?? []);
  const usable = dbFiltered.filter(
    (h) =>
      !excludeSet.has(h.character) &&
      !isExcludedFromRecommend({ character: h.character, meaning: h.meaning }),
  );

  // 3. 첫 글자별 best-by-score 버퍼 (39-C char2 품질 패스).
  //    구 설계: 첫 글자 cap을 **인카운터 순서**로 채움 → 풀이 stroke ASC라 최저획 char2가
  //    먼저 cap을 채우고 잠김(蘇玟刁 회귀: 刁=2획 char2 고정). →
  //    신 설계: 모든 조합을 평가하되 첫 글자별 **상위 PER_FIRST_KEEP개(점수순, 동점 상용도순)**만
  //    유지 → char2가 "최저획"이 아닌 "최고점"으로 선택됨.
  //    메모리 O(distinct 첫 글자 × PER_FIRST_KEEP) — pool² materialize 없음 → 503 회피.
  //    (cap-skip 제거로 makeCandidate는 모든 조합 호출 — POOL_LIMIT 500이면 n=2 ≤25만,
  //     c5-7c 실측 p95 193ms 범위. 객체는 버킷 외 즉시 GC.)
  const PER_FIRST_KEEP = 2; // 출력 다양성(첫 글자당 ≤2) — 39-C 계승.
  const buckets = new Map<string, NameCandidate[]>(); // 각 버킷 compareCandidate desc
  function consider(cand: NameCandidate): void {
    const first = cand.hangeul[0] ?? "";
    const arr = buckets.get(first);
    if (!arr) {
      buckets.set(first, [cand]);
    } else if (arr.length < PER_FIRST_KEEP) {
      arr.push(cand);
      arr.sort(compareCandidate);
    } else if (compareCandidate(cand, arr[arr.length - 1]) < 0) {
      arr[arr.length - 1] = cand; // 최하위 교체 (cand가 더 우수)
      arr.sort(compareCandidate);
    }
  }

  // 4. 조합 생성 → consider (cap-skip 없음: 모든 char2 평가 → 최고점 char2 선택).
  if (options.nameLength === 1) {
    for (const c of usable) consider(makeCandidate([c], options));
  } else {
    for (let i = 0; i < usable.length; i++) {
      for (let j = 0; j < usable.length; j++) {
        if (i === j) continue; // 같은 글자 중복 제외
        consider(makeCandidate([usable[i], usable[j]], options));
      }
    }
  }

  // 5. 다양성 선별 — 첫 글자 distinct 우선 (39-C). 각 버킷은 이미 desc.
  const buffer: NameCandidate[] = [];
  for (const arr of buckets.values()) buffer.push(...arr);
  return selectDiverse(buffer, limit);
}

/**
 * 점수 desc 버퍼에서 topN 선택 — 첫 글자 distinct 우선 (다양성).
 *   버퍼를 첫 글자별로 그룹 후 rank 0(각 그룹 best)부터 라운드로빈 → distinct 우선.
 *   topN ≤ distinct 첫 글자 수면 전원 distinct. 최종 점수 desc 정렬.
 */
export function selectDiverse(
  buffer: NameCandidate[],
  limit: number,
): NameCandidate[] {
  if (limit <= 0) return [];
  const byFirst = new Map<string, NameCandidate[]>();
  for (const c of buffer) {
    const f = c.hangeul[0] ?? "";
    const arr = byFirst.get(f);
    if (arr) arr.push(c);
    else byFirst.set(f, [c]);
  }
  const buckets = [...byFirst.values()]; // buffer가 desc라 각 그룹도 desc
  for (const b of buckets) b.sort(compareCandidate); // 그룹 내 점수·상용도 desc 보장
  const result: NameCandidate[] = [];
  let rank = 0;
  while (result.length < limit) {
    const tier = buckets.filter((b) => b.length > rank).map((b) => b[rank]);
    if (tier.length === 0) break;
    tier.sort(compareCandidate);
    for (const c of tier) {
      if (result.length >= limit) break;
      result.push(c);
    }
    rank++;
  }
  result.sort(compareCandidate);
  return result;
}

// 검증은 `poc/names-poc.test.ts`로 분리됨 (Edge runtime 호환).
