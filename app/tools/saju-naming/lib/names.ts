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
import { buildEumyangMeta, type EumyangMeta } from "./eumyang";

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
  /** C-1 신규: 음양 배열 메타. result="흉"이면 길 후보 부족 시 fallback 보충된 후보. */
  eumyang: EumyangMeta;
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

  // C-1 음양 배열 메타 — 원획(won_stroke) 홀짝, 점수 모델 미반영.
  const eumyang = buildEumyangMeta(options.sungStroke, wonStrokes);

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
    eumyang,
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

  // 3. 첫 글자별 cap 버퍼 (다양성) — 첫 글자당 PER_FIRST_KEEP개.
  //    핵심: db는 route에서 `frequency DESC`(007 상용도 티어) 정렬 → 풀 순회 시 **상용 한자가
  //    먼저** 등장. cap을 인카운터순으로 채우면 자연히 **상용 char1·char2**가 선택됨.
  //    (구 버그 蘇玟刁의 刁=최저획 char2 고정은 풀이 stroke ASC였기 때문 — 007 freq-DESC로 해소.)
  //    메모리 O(distinct 첫 글자 × PER_FIRST_KEEP) — pool² 없음(OOM 회피).
  //
  //    ⚠️ C-1 후속(char2 다양성): dev 회귀에서 외숙모 char2 = 了 100% 독점 발견
  //    (予了·兮了·化了·壬了·巨了). 원인 = D1 풀 정렬(freq DESC + stroke ASC)에서 了가
  //    풀 최상단 + j 루프가 매번 풀 맨 앞부터 → 동점 점수 후보의 char2가 同 글자.
  //    조치 A — consider 시 **그룹 내 char2 unique 강제** (점수 max 유지): 같은 char1 그룹에
  //              동일 char2 후보가 있으면 점수 더 높은 것 keep. cap 미차면 다른 char2 admit.
  //              → 각 char1 그룹에 다양 char2 보장. global cap 회피 (작은 풀에서 case4b 손실 방지).
  //    조치 B — selectDiverse 3단 fallback: char1·char2 distinct → char1 distinct → 전체.
  //    결정론·점수 모델·39-C 가드·음양 필터 모두 무오염.
  //    nameLength=1: char2=""이라 group 내 unique = 일반 cap 동작 (skip).
  const PER_FIRST_KEEP = 2; // 출력 다양성(첫 글자당 ≤2).
  const buckets = new Map<string, NameCandidate[]>(); // 각 버킷 compareCandidate desc
  const bucketFull = (first: string): boolean =>
    (buckets.get(first)?.length ?? 0) >= PER_FIRST_KEEP;
  function consider(cand: NameCandidate): void {
    const first = cand.hangeul[0] ?? "";
    const second = cand.hangeul[1] ?? ""; // nameLength=1 → ""
    const arr = buckets.get(first);
    if (!arr) {
      buckets.set(first, [cand]);
      return;
    }
    // 그룹 내 같은 char2 후보가 있으면 점수 max 유지 (교체 또는 skip).
    if (second) {
      const dupIdx = arr.findIndex((c) => c.hangeul[1] === second);
      if (dupIdx >= 0) {
        if (compareCandidate(cand, arr[dupIdx]) < 0) {
          arr[dupIdx] = cand;
          arr.sort(compareCandidate);
        }
        return;
      }
    }
    // 새 char2 — cap 미차면 admit, 차면 최저 점수와 교체(점수 max 유지).
    if (arr.length < PER_FIRST_KEEP) {
      arr.push(cand);
      arr.sort(compareCandidate);
    } else {
      const lowest = arr[arr.length - 1];
      if (compareCandidate(cand, lowest) < 0) {
        arr[arr.length - 1] = cand;
        arr.sort(compareCandidate);
      }
    }
  }

  // 4. 조합 생성 → consider. 첫 글자 버킷이 차면 skip(cap-skip).
  //    ⚠️ CPU: evaluateSoundOhaeng는 무거워 무제한/대량 char2 평가 시 Workers CPU 초과 → 503
  //    (dev 회귀 2회 확인: 무제한 25만 17/20·char2상위40 2만 3/20). cap-skip은 첫 글자별 ~2조합만
  //    평가(총 ≈ distinct 첫글자 × 2, 수백) → CPU 안전(prod 검증). char2 best-by-score는
  //    CPU 한계로 보류 — 007 freq-DESC 풀이 상용 char2를 보장(동일 목표 달성).
  if (options.nameLength === 1) {
    for (const c of usable) {
      if (bucketFull(c.hangeul[0] ?? "")) continue;
      consider(makeCandidate([c], options));
    }
  } else {
    for (let i = 0; i < usable.length; i++) {
      const firstSyl = usable[i].hangeul[0] ?? "";
      if (bucketFull(firstSyl)) continue; // 첫 글자 cap → 이 char1 조합 전체 skip
      for (let j = 0; j < usable.length; j++) {
        if (i === j) continue; // 같은 글자 중복 제외
        if (bucketFull(firstSyl)) break; // 루프 중 cap 도달 → 중단
        consider(makeCandidate([usable[i], usable[j]], options));
      }
    }
  }

  // 5. 다양성 선별 — 첫 글자 distinct 우선 (39-C). 각 버킷은 이미 desc.
  const buffer: NameCandidate[] = [];
  for (const arr of buckets.values()) buffer.push(...arr);

  // 6. C-1 음양 배열 후처리 — 길 우선 채움, 부족 시 흉 fallback (Plan 안전장치).
  //    nameLength=1 풀이 작을 때 흉만 남아도 추천 0 회피 + 사용자에 부조화 가시화.
  const gilBuffer = buffer.filter((c) => c.eumyang.result === "길");
  const hyungBuffer = buffer.filter((c) => c.eumyang.result === "흉");
  const gilSelected = selectDiverse(gilBuffer, limit);
  if (gilSelected.length >= limit) return gilSelected;
  const need = limit - gilSelected.length;
  const hyungSelected = selectDiverse(hyungBuffer, need);
  const combined = [...gilSelected, ...hyungSelected];
  combined.sort(compareCandidate);
  return combined;
}

/**
 * 점수 desc 버퍼에서 topN 선택 — char1·char2 distinct 우선, 3단 fallback.
 *
 * C-1 후속(char2 다양성, 외숙모 了 독점 해소):
 *   Phase 1: char1·char2 둘 다 distinct (작명 다양성 핵심).
 *   Phase 2: char1만 distinct, char2 중복 허용 (기존 동작).
 *   Phase 3: 남은 모든 후보 (점수 desc) — 풀 부족 fallback.
 *
 * nameLength=1 (char2 = "") → Phase 1에서 char2 logic 자동 skip → char1 distinct만.
 *
 * 시그니처 유지 — 외부 호출처(PoC 등) 무영향.
 * 입력 buffer는 정렬 무관 (내부에서 compareCandidate desc 정렬).
 */
export function selectDiverse(
  buffer: NameCandidate[],
  limit: number,
): NameCandidate[] {
  if (limit <= 0) return [];
  // 점수 desc 정렬 (입력 정렬 무관 보장)
  const sorted = [...buffer].sort(compareCandidate);
  const used = new Set<NameCandidate>();
  const usedC1 = new Set<string>();
  const usedC2 = new Set<string>();
  const result: NameCandidate[] = [];

  // Phase 1: char1·char2 둘 다 distinct
  for (const c of sorted) {
    if (result.length >= limit) break;
    const c1 = c.hangeul[0] ?? "";
    const c2 = c.hangeul[1] ?? "";
    if (usedC1.has(c1)) continue;
    if (c2 && usedC2.has(c2)) continue;
    usedC1.add(c1);
    if (c2) usedC2.add(c2);
    result.push(c);
    used.add(c);
  }

  // Phase 2: char1만 distinct (char2 중복 허용)
  if (result.length < limit) {
    for (const c of sorted) {
      if (result.length >= limit) break;
      if (used.has(c)) continue;
      const c1 = c.hangeul[0] ?? "";
      if (usedC1.has(c1)) continue;
      usedC1.add(c1);
      result.push(c);
      used.add(c);
    }
  }

  // Phase 3: 남은 모든 후보 (점수 desc)
  if (result.length < limit) {
    for (const c of sorted) {
      if (result.length >= limit) break;
      if (used.has(c)) continue;
      result.push(c);
      used.add(c);
    }
  }

  result.sort(compareCandidate);
  return result;
}

// 검증은 `poc/names-poc.test.ts`로 분리됨 (Edge runtime 호환).
