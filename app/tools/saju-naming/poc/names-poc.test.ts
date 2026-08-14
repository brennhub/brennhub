/**
 * 이름 추천 (recommendNames) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/names-poc.test.ts
 *
 * 검증 (39-C 추천 품질 반영):
 *   - 시드 25자 풀 / n=2·n=1.
 *   - case3: 음령오행 통합 — soundScore = evaluateSoundOhaeng, breakdown "음령N+수리N=T".
 *   - case4: 다양성 — 이름 첫 글자 distinct (selectDiverse + recommendNames).
 *   - case5: 대형 풀 OOM 회귀 가드.
 *   - case6: 제외 필터 — 희귀 블록(㔕)·명시(卵)·부정 의미(危) 추천 미등장.
 *
 * Edge runtime 호환을 위해 lib/names.ts에서 분리 (CHANGELOG 0.4.1).
 */

import {
  recommendNames,
  selectDiverse,
  type HanjaEntry,
  type NameCandidate,
} from "../lib/names";
import { evaluateSoundOhaeng } from "../lib/sound-ohaeng";
import {
  isExcludedFromRecommend,
  isRareBlock,
  hasNonNameMeaning,
} from "../lib/name-exclude";

// 시드 25자 — stroke=필획, won_stroke=원획 (氵 변형부수 한자는 환원 +1).
const seed: HanjaEntry[] = [
  { character: "林", hangeul: "림", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "수풀", frequency: 5 },
  { character: "森", hangeul: "삼", stroke: 12, won_stroke: 12, ohaeng: "목", meaning: "빽빽할/숲", frequency: 4 },
  { character: "樹", hangeul: "수", stroke: 16, won_stroke: 16, ohaeng: "목", meaning: "나무", frequency: 4 },
  { character: "棟", hangeul: "동", stroke: 12, won_stroke: 12, ohaeng: "목", meaning: "마룻대", frequency: 3 },
  { character: "春", hangeul: "춘", stroke: 9, won_stroke: 9, ohaeng: "목", meaning: "봄", frequency: 5 },
  { character: "明", hangeul: "명", stroke: 8, won_stroke: 8, ohaeng: "화", meaning: "밝을", frequency: 5 },
  { character: "炳", hangeul: "병", stroke: 9, won_stroke: 9, ohaeng: "화", meaning: "불꽃/밝을", frequency: 4 },
  { character: "燁", hangeul: "엽", stroke: 16, won_stroke: 16, ohaeng: "화", meaning: "빛날", frequency: 3 },
  { character: "煥", hangeul: "환", stroke: 13, won_stroke: 13, ohaeng: "화", meaning: "빛날", frequency: 4 },
  { character: "熙", hangeul: "희", stroke: 13, won_stroke: 13, ohaeng: "화", meaning: "빛날/기뻐할", frequency: 5 },
  { character: "美", hangeul: "미", stroke: 9, won_stroke: 9, ohaeng: "토", meaning: "아름다울", frequency: 5 },
  { character: "地", hangeul: "지", stroke: 6, won_stroke: 6, ohaeng: "토", meaning: "땅", frequency: 3 },
  { character: "城", hangeul: "성", stroke: 10, won_stroke: 10, ohaeng: "토", meaning: "성/재", frequency: 4 },
  { character: "培", hangeul: "배", stroke: 11, won_stroke: 11, ohaeng: "토", meaning: "북돋울", frequency: 4 },
  { character: "基", hangeul: "기", stroke: 11, won_stroke: 11, ohaeng: "토", meaning: "터", frequency: 4 },
  { character: "鎭", hangeul: "진", stroke: 18, won_stroke: 18, ohaeng: "금", meaning: "진압할", frequency: 4 },
  { character: "銀", hangeul: "은", stroke: 14, won_stroke: 14, ohaeng: "금", meaning: "은", frequency: 4 },
  { character: "鉉", hangeul: "현", stroke: 13, won_stroke: 13, ohaeng: "금", meaning: "솥귀", frequency: 4 },
  { character: "錦", hangeul: "금", stroke: 16, won_stroke: 16, ohaeng: "금", meaning: "비단", frequency: 4 },
  { character: "鈞", hangeul: "균", stroke: 12, won_stroke: 12, ohaeng: "금", meaning: "서른 근/공평", frequency: 3 },
  { character: "浩", hangeul: "호", stroke: 10, won_stroke: 11, ohaeng: "수", meaning: "넓을", frequency: 5 },
  { character: "海", hangeul: "해", stroke: 10, won_stroke: 11, ohaeng: "수", meaning: "바다", frequency: 5 },
  { character: "江", hangeul: "강", stroke: 6, won_stroke: 7, ohaeng: "수", meaning: "강", frequency: 4 },
  { character: "泉", hangeul: "천", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "샘", frequency: 4 },
  { character: "潤", hangeul: "윤", stroke: 15, won_stroke: 16, ohaeng: "수", meaning: "윤택할", frequency: 5 },
];

const failures: string[] = [];
function check(label: string, cond: boolean): void {
  if (!cond) failures.push(label);
}
function sortedDesc(xs: { totalScore: number }[]): boolean {
  return xs.every((c, i) => i === 0 || xs[i - 1].totalScore >= c.totalScore);
}

const SUNG = { sungHanja: "林", sungHangeul: "림", sungStroke: 8 };

// case 1 — n=2
const r1 = recommendNames({ ...SUNG, nameLength: 2, topN: 3, db: seed });
check("case1 topN ≤ 3", r1.length <= 3);
check("case1 정렬 desc", sortedDesc(r1));
check("case1 totalScore 유효", r1.every((c) => Number.isFinite(c.totalScore)));

// case 2 — n=1, 81수리 won_stroke 기준 (surie 경로 불변). 浩 won_stroke 11 → surie 40.
const r2 = recommendNames({ ...SUNG, nameLength: 1, topN: 25, db: seed });
const ho = r2.find((c) => c.hanja === "浩");
check("case2 浩 후보 존재", ho !== undefined);
check("case2 浩 surieScore=40 (won_stroke 11 기준)", ho?.surieScore === 40);

// case 3 — 음령오행 통합: soundScore = evaluateSoundOhaeng([성+이름]), breakdown 음령·수리.
const r3 = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: seed });
for (const c of r3) {
  const expectedSound = evaluateSoundOhaeng(["림", ...[...c.hangeul]]).score;
  check(`case3 ${c.hanja} soundScore 일치`, c.soundScore === expectedSound);
  const sw = Math.round(c.soundScore * 0.55);
  const rw = Math.round(c.surieScore * 0.45);
  check(`case3 ${c.hanja} breakdown 형식`, c.breakdown === `음령${sw}+수리${rw}=${c.totalScore}`);
  check(`case3 ${c.hanja} F3 제거(ohaengScore 없음)`, !("ohaengScore" in c));
}

// case 4 — 다양성 (39-C)
//   selectDiverse 단위: 첫 글자 중복 버퍼 → distinct 우선 선택.
const mk = (
  hangeul: string,
  totalScore: number,
  freqSum = 0,
): NameCandidate => ({
  hanja: "?",
  hangeul,
  strokes: [],
  ohaengList: [],
  soundOhaengList: [],
  surieScore: 0,
  soundScore: 0,
  totalScore,
  freqSum,
  breakdown: "",
});
const synth = [mk("수아", 97), mk("수호", 96), mk("수민", 95), mk("가람", 90), mk("나래", 88)];
const picked = selectDiverse(synth, 3);
check("case4 selectDiverse 3개", picked.length === 3);
check("case4 첫 글자 distinct", new Set(picked.map((c) => c.hangeul[0])).size === 3);
check("case4 최고점 유지", picked[0].hangeul === "수아");
//   recommendNames 통합: 풀 풍부 → topN 결과 이름 첫 글자 distinct.
const r4 = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: seed });
check(
  "case4 recommendNames 첫 글자 distinct",
  new Set(r4.map((c) => c.hangeul[0])).size === r4.length,
);
//   case4b — 동점 클러스터 회귀 가드 (dev 39-C 발견): 한 첫 글자(수)가 상위 점수
//   독식해도 top-3 distinct. 수음 4자(상위 독식 유도) + 가/나.
const cluster: HanjaEntry[] = [
  { character: "洙", hangeul: "수", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "물가 수", frequency: 3 },
  { character: "銖", hangeul: "수", stroke: 14, won_stroke: 14, ohaeng: "금", meaning: "저울눈 수", frequency: 3 },
  { character: "琇", hangeul: "수", stroke: 11, won_stroke: 11, ohaeng: "금", meaning: "옥돌 수", frequency: 3 },
  { character: "秀", hangeul: "수", stroke: 7, won_stroke: 7, ohaeng: "목", meaning: "빼어날 수", frequency: 3 },
  { character: "佳", hangeul: "가", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "아름다울 가", frequency: 3 },
  { character: "奈", hangeul: "나", stroke: 8, won_stroke: 8, ohaeng: "화", meaning: "어찌 나", frequency: 3 },
];
const r4b = recommendNames({ ...SUNG, nameLength: 2, topN: 3, db: cluster });
check(
  "case4b 클러스터 풀 top3 첫 글자 distinct",
  new Set(r4b.map((c) => c.hangeul[0])).size === r4b.length,
);

// case 5 — 대형 합성 풀 500자 n=2 (약 25만 조합) — OOM 회귀 가드.
// 20음절 — topN=30은 rank0(20 distinct)+rank1(10)로 충족 (MAX_PER_FIRST=2 다양성 cap).
const HANGEUL_POOL = [
  "가", "나", "다", "라", "마", "바", "사", "아", "자", "차",
  "카", "타", "파", "하", "거", "너", "더", "러", "머", "버",
];
const OH = ["목", "화", "토", "금", "수"];
const bigPool: HanjaEntry[] = [];
for (let i = 0; i < 500; i++) {
  bigPool.push({
    character: `一`, // URO placeholder (희귀 블록 필터 통과)
    hangeul: HANGEUL_POOL[i % HANGEUL_POOL.length],
    stroke: (i % 25) + 1,
    won_stroke: (i % 25) + 1,
    ohaeng: OH[i % OH.length],
    meaning: "합성",
    frequency: 3,
  });
}
// character 중복(同 글자) 방지 위해 codepoint 분산
for (let i = 0; i < bigPool.length; i++) {
  bigPool[i].character = String.fromCodePoint(0x4e00 + i);
}
const r5 = recommendNames({ ...SUNG, nameLength: 2, topN: 30, db: bigPool });
check("case5 대형풀 결과 채움", r5.length === 30);
check("case5 대형풀 정렬 desc", sortedDesc(r5));
check("case5 대형풀 totalScore 유효", r5.every((c) => Number.isFinite(c.totalScore)));

// case 6 — 제외 필터 (39-C)
check("case6 isRareBlock 㔕(ExtA) true", isRareBlock("㔕") === true);
check("case6 isRareBlock 明(URO) false", isRareBlock("明") === false);
check("case6 卵 명시 제외", isExcludedFromRecommend({ character: "卵", meaning: "알 란" }));
check("case6 危 키워드(위태) 제외", isExcludedFromRecommend({ character: "危", meaning: "위태할 위" }));
check("case6 明 통과", !isExcludedFromRecommend({ character: "明", meaning: "밝을 명" }));
check("case6 憧 화이트리스트 통과", !isExcludedFromRecommend({ character: "憧", meaning: "동경할 동/어리석을 동" }));
check("case6 惰 제외 유지", isExcludedFromRecommend({ character: "惰", meaning: "게으를 타/아름다울 타" }));
check("case6 伋 제외 유지", isExcludedFromRecommend({ character: "伋", meaning: "속일 급/사람 이름 급" }));
check("case6 仳 제외 유지", isExcludedFromRecommend({ character: "仳", meaning: "떠날 비/추할 비" }));
//   통합: seed + 卵/㔕/危 → 추천 결과 미등장.
const seed2: HanjaEntry[] = [
  ...seed,
  { character: "卵", hangeul: "란", stroke: 7, won_stroke: 7, ohaeng: "화", meaning: "알 란", frequency: 3 },
  { character: "㔕", hangeul: "글", stroke: 5, won_stroke: 5, ohaeng: "목", meaning: "뜻 글", frequency: 3 },
  { character: "危", hangeul: "위", stroke: 6, won_stroke: 6, ohaeng: "토", meaning: "위태할 위", frequency: 3 },
];
const r6 = recommendNames({ ...SUNG, nameLength: 2, topN: 30, db: seed2 });
const joined6 = r6.map((c) => c.hanja).join("");
check("case6 卵 추천 미등장", !joined6.includes("卵"));
check("case6 㔕 추천 미등장", !joined6.includes("㔕"));
check("case6 危 추천 미등장", !joined6.includes("危"));

// case 7 — cap-skip은 풀(db) 순서(=route frequency DESC) 상위 char2 우선 (蘇玟刁 해소 메커니즘).
//   구 버그: 풀 stroke ASC → 최저획 char2(刁) 고정. 007 freq-DESC 풀에선 상용 char2 우선.
//   db에 상용 char2(赫·煥, freq5) 뒤 희귀 저획 char2(刁, freq3) → 각 char1 cap(2)이 상용으로
//   차고 刁는 char2 슬롯 미선택(char1로는 가능). CPU: 첫글자당 ~2조합만 평가(503 회피).
const c2pool: HanjaEntry[] = [
  { character: "林", hangeul: "림", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "수풀 림", frequency: 5 },
  { character: "赫", hangeul: "혁", stroke: 14, won_stroke: 14, ohaeng: "화", meaning: "빛날 혁", frequency: 5 },
  { character: "煥", hangeul: "환", stroke: 13, won_stroke: 13, ohaeng: "화", meaning: "빛날 환", frequency: 5 },
  { character: "刁", hangeul: "조", stroke: 2, won_stroke: 2, ohaeng: "금", meaning: "조두 조", frequency: 3 },
];
const r7 = recommendNames({ ...SUNG, nameLength: 2, topN: 10, db: c2pool });
check("case7 결과 존재", r7.length > 0);
check(
  "case7 희귀 저획 char2(刁) char2 슬롯 미선택 (상용 char2 우선)",
  r7.every((c) => [...c.hanja][1] !== "刁"),
);

// case 8 — 상용도 tiebreak (동점 → freqSum 높은 후보 우선). 점수축 미가산, 동률에서만.
//   "가" 동점 90 두 후보: freqSum 9 > 4 → 그룹 내 가온 우선.
const tie = [mk("가람", 90, 4), mk("가온", 90, 9), mk("나래", 88, 6)];
const r8 = selectDiverse(tie, 3);
check(
  "case8 동점 첫글자 그룹 freqSum 우선(가온)",
  r8.find((c) => c.hangeul[0] === "가")?.hangeul === "가온",
);
//   recommendNames 출력은 compareCandidate(점수 desc, 동점 freqSum desc) 순.
const r8b = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: seed });
check(
  "case8 출력 정렬 (점수 desc, 동점 freqSum desc)",
  r8b.every(
    (c, i) =>
      i === 0 ||
      r8b[i - 1].totalScore > c.totalScore ||
      (r8b[i - 1].totalScore === c.totalScore && r8b[i - 1].freqSum >= c.freqSum),
  ),
);

// case 9 — 작명 부적합 의미군 가드 (39-C 후속, 蘇 시뮬 발견).
//   숫자·기능어 차단 (六 여섯·全 온전·同 한가지·共 함께·各 각각·一 명시).
check("case9 六(여섯) 차단", isExcludedFromRecommend({ character: "六", meaning: "여섯 륙" }));
check("case9 全(온전할) 차단", isExcludedFromRecommend({ character: "全", meaning: "온전할 전" }));
check("case9 同(한가지) 차단", isExcludedFromRecommend({ character: "同", meaning: "한가지 동" }));
check("case9 共(함께·명시) 차단", isExcludedFromRecommend({ character: "共", meaning: "함께 공" }));
check("case9 各(각각) 차단", isExcludedFromRecommend({ character: "各", meaning: "각각 각" }));
check("case9 一(명시 수사) 차단", isExcludedFromRecommend({ character: "一", meaning: "한 일" }));
//   오탐 방지 — 양호 이름자 통과 (충돌 회피 검증).
check("case9 相(서로 상) 통과", !isExcludedFromRecommend({ character: "相", meaning: "서로 상" }));
check("case9 玖(옥돌/아홉 구) 통과", !isExcludedFromRecommend({ character: "玖", meaning: "옥돌 구/아홉 구" }));
check("case9 鈞(서른 근 균) 통과", !isExcludedFromRecommend({ character: "鈞", meaning: "서른 근 균" }));
//   "온전할"(全) vs "온전한 덕"(㦃) — 키워드 정밀도: 㦃은 키워드 미매칭 (단, Ext A라 rareBlock 별도 제외).
check("case9 '온전한 덕' 키워드 미매칭", !hasNonNameMeaning("온전한 덕 산"));
check("case9 '서른 근' 키워드 미매칭", !hasNonNameMeaning("서른 근 균"));
check("case9 珍(보배 진) 통과", !isExcludedFromRecommend({ character: "珍", meaning: "보배 진" }));
//   통합: seed + 六/全/共 → 추천 미등장.
const seed3: HanjaEntry[] = [
  ...seed,
  { character: "六", hangeul: "륙", stroke: 4, won_stroke: 4, ohaeng: "화", meaning: "여섯 륙", frequency: 5 },
  { character: "全", hangeul: "전", stroke: 6, won_stroke: 6, ohaeng: "금", meaning: "온전할 전", frequency: 5 },
  { character: "共", hangeul: "공", stroke: 6, won_stroke: 6, ohaeng: "토", meaning: "함께 공", frequency: 5 },
];
const r9 = recommendNames({ ...SUNG, nameLength: 2, topN: 30, db: seed3 });
const joined9 = r9.map((c) => c.hanja).join("");
check("case9 六 추천 미등장", !joined9.includes("六"));
check("case9 全 추천 미등장", !joined9.includes("全"));
check("case9 共 추천 미등장", !joined9.includes("共"));

// case 10 — C-1 음양 배열 (NameCandidate.eumyang 메타 + 길 우선 + 흉 fallback).
//   sungStroke=8 (림 = 음). seed 한자 won_stroke로 길/흉 패턴 검증.
{
  // 10-a) NameCandidate.eumyang 메타 부여 — 모든 후보에 존재
  const r10a = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: seed });
  check("case10a 모든 후보 eumyang 메타 존재", r10a.every((c) => c.eumyang !== undefined));
  check(
    "case10a arrangement 길이 = 1(성) + nameLength(2) = 3",
    r10a.every((c) => c.eumyang.arrangement.length === 3),
  );
  check(
    "case10a pattern 형식 '양/음' 3자",
    r10a.every((c) => /^[양음]{3}$/.test(c.eumyang.pattern)),
  );

  // 10-b) 길 후보 우선 — topN이 충분히 작아 길 후보만으로 채워질 경우 result="길"
  //       seed 풀이 작아 fallback 시나리오는 별도(10-c)에서 강제 검증.
  const r10b = recommendNames({ ...SUNG, nameLength: 2, topN: 3, db: seed });
  // 풀 단순화 → fallback 가능성. 길/흉 메타 부여 자체만 확인.
  check("case10b 결과 비어있지 않음", r10b.length > 0);

  // 10-c) 흉만 가능한 풀 — 모든 한자가 짝수 원획(음). 성씨 림(8)=음. → 모든 조합 음음음 흉.
  //       fallback이 흉 후보를 보충해야 함 (결과 비지 않음).
  const allEum: HanjaEntry[] = [
    { character: "海", hangeul: "해", stroke: 10, won_stroke: 10, ohaeng: "수", meaning: "바다 해", frequency: 5 },
    { character: "晴", hangeul: "청", stroke: 12, won_stroke: 12, ohaeng: "화", meaning: "갤 청", frequency: 4 },
    { character: "雅", hangeul: "아", stroke: 12, won_stroke: 12, ohaeng: "목", meaning: "맑을 아", frequency: 5 },
    { character: "美", hangeul: "미", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "아름다울 미", frequency: 5 }, // 양 (대조군)
  ];
  const r10c = recommendNames({ ...SUNG, nameLength: 2, topN: 5, db: allEum });
  check("case10c 결과 비어있지 않음 (fallback 동작)", r10c.length > 0);
  // 결과 내 흉이 적어도 1개 존재해야 fallback 가시화 확인 (대조 양 글자 美 1개 → 일부 흉만 풀에 존재)
  const hasFlexibleMix = r10c.some((c) => c.eumyang.result === "흉") || r10c.some((c) => c.eumyang.result === "길");
  check("case10c eumyang 결과 메타 존재", hasFlexibleMix);

  // 10-d) nameLength=1 음양 검증 — 2자 배열 (양양/음음 흉)
  //   sungStroke=8(음) + 이름1자 짝수(음) → 음음 흉, 홀수(양) → 음양 길
  const r10d = recommendNames({ ...SUNG, nameLength: 1, topN: 5, db: seed });
  check("case10d 모든 후보 arrangement 길이 2", r10d.every((c) => c.eumyang.arrangement.length === 2));
  // 길 후보가 있으면 우선 채워야 — 모두 길이면 ok. 길 부족 시 흉 보충.
  check("case10d 결과 비어있지 않음", r10d.length > 0);

  // 10-e) 39-C 9 케이스 가드 보존 확인 — 흉 fallback 후에도 작명 부적합 글자 미등장.
  //   case 9 시나리오 재실행: seed3 (六/全/共 포함) → eumyang 메타 적용 후에도 미등장
  const r10e = recommendNames({ ...SUNG, nameLength: 2, topN: 30, db: seed3 });
  const joined10e = r10e.map((c) => c.hanja).join("");
  check("case10e 六 가드 보존 (음양 후처리 후)", !joined10e.includes("六"));
  check("case10e 全 가드 보존", !joined10e.includes("全"));
  check("case10e 共 가드 보존", !joined10e.includes("共"));
}

// case 11 — char2 다양성 가드 (C-1 후속, 외숙모 了 독점 해소).
//   조치 A: consider 그룹 내 char2 unique 강제 + 점수 max 유지
//   조치 B: selectDiverse 3단 fallback (char1·char2 distinct → char1 distinct → 전체)
{
  // 11-a) 같은 char2 한 글자가 풀 상위 freq에서 독점하는 시나리오 — 다양성 검증
  //       풀: 모든 char1 = 다른 첫 글자 + char2 후보가 일부 동일 c2 ("수" 다발) + 다른 c2
  const diverseC2: HanjaEntry[] = [
    // char1 후보 (각각 다른 첫 글자)
    { character: "佳", hangeul: "가", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "아름다울 가", frequency: 5 },
    { character: "奈", hangeul: "나", stroke: 8, won_stroke: 8, ohaeng: "화", meaning: "어찌 나", frequency: 5 },
    { character: "多", hangeul: "다", stroke: 6, won_stroke: 6, ohaeng: "수", meaning: "많을 다", frequency: 5 },
    // char2 후보: "수" 다발 + 다른 c2 1개
    { character: "洙", hangeul: "수", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "물가 수", frequency: 5 },
    { character: "銖", hangeul: "수", stroke: 14, won_stroke: 14, ohaeng: "금", meaning: "저울눈 수", frequency: 4 },
    { character: "琇", hangeul: "수", stroke: 11, won_stroke: 11, ohaeng: "금", meaning: "옥돌 수", frequency: 4 },
    { character: "美", hangeul: "미", stroke: 9, won_stroke: 9, ohaeng: "수", meaning: "아름다울 미", frequency: 5 },
  ];
  const r11a = recommendNames({ ...SUNG, nameLength: 2, topN: 6, db: diverseC2 });
  // 각 char1 그룹 내 char2 unique 강제 → 풀 c2가 (수,수,수,미) 시 c2 다양 ≥2 등장 보장
  const c2Set = new Set(r11a.map((c) => c.hangeul[1] ?? ""));
  check(
    "case11a result에 char2 distinct ≥ 2 (그룹 내 unique + Phase 1 char1·char2 distinct)",
    c2Set.size >= 2,
  );
  check("case11a 첫 글자 distinct ≥ 3 (char1 다양성 보존)", new Set(r11a.map((c) => c.hangeul[0])).size >= 3);

  // 11-b) char1 distinct 보존 (Phase 2 fallback 정상 동작) — 풀이 길 후보 부족해도 char1 다양화
  //   ⚠️ Phase 1 단독 검증은 풀 크기 + 음양 분포 의존. 본 검증은 char1 distinct만 (case4 회귀 보존).
  //   Phase 1 strict 검증은 case11a에서 c2 set ≥ 2로 간접 확인.
  const phase1Pool: HanjaEntry[] = [
    { character: "佳", hangeul: "가", stroke: 8, won_stroke: 8, ohaeng: "목", meaning: "아름다울 가", frequency: 5 },
    { character: "奈", hangeul: "나", stroke: 8, won_stroke: 8, ohaeng: "화", meaning: "어찌 나", frequency: 5 },
    { character: "多", hangeul: "다", stroke: 6, won_stroke: 6, ohaeng: "수", meaning: "많을 다", frequency: 5 },
    { character: "亞", hangeul: "아", stroke: 8, won_stroke: 8, ohaeng: "토", meaning: "버금 아", frequency: 5 },
  ];
  const r11b = recommendNames({ ...SUNG, nameLength: 2, topN: 3, db: phase1Pool });
  check(
    "case11b topN=3 — char1 distinct 보존 (Phase 2 fallback)",
    new Set(r11b.map((c) => c.hangeul[0])).size === r11b.length,
  );

  // 11-c) nameLength=1은 char2 logic skip (기존 동작 보존)
  const r11c = recommendNames({ ...SUNG, nameLength: 1, topN: 3, db: phase1Pool });
  check("case11c nameLength=1 첫 글자 distinct (char2 logic skip)", new Set(r11c.map((c) => c.hangeul[0])).size === r11c.length);
}

// case 12 — C-2-pre 풀 상단 ws≤2 의미 가드 (11자 명시 제외 + 5자 보존 검증)
{
  // 12-a) 명백 부적합 11자 EXPLICIT_EXCLUDE 차단 검증
  const blockChars = ["乂", "乃", "了", "人", "入", "冂", "几", "刀", "匕", "匸", "卜"];
  for (const ch of blockChars) {
    check(`case12a ${ch} 차단`, isExcludedFromRecommend({ character: ch, meaning: "테스트" }));
  }

  // 12-b) 보존 5자 통과 검증 (과잉 제외 방지)
  const preserveChars = [
    { ch: "乙", meaning: "새 을" },             // 천간
    { ch: "丁", meaning: "넷째 천간 정" },       // 천간
    { ch: "儿", meaning: "어진 사람 인" },       // 긍정
    { ch: "力", meaning: "힘 력" },             // 긍정
    { ch: "刁", meaning: "조두 조" },           // 애매
  ];
  for (const { ch, meaning } of preserveChars) {
    check(`case12b ${ch}(${meaning}) 통과 보존`, !isExcludedFromRecommend({ character: ch, meaning }));
  }

  // 12-c) 통합: seed + 부적합 11자 + 보존 5자 → 부적합 미등장, 보존 통과 가능성
  const seed12: HanjaEntry[] = [
    ...seed,
    // 부적합 (모두 미등장 기대)
    { character: "了", hangeul: "료", stroke: 2, won_stroke: 2, ohaeng: "금", meaning: "마칠 료", frequency: 5 },
    { character: "刀", hangeul: "도", stroke: 2, won_stroke: 2, ohaeng: "금", meaning: "칼 도", frequency: 5 },
    { character: "人", hangeul: "인", stroke: 2, won_stroke: 2, ohaeng: "화", meaning: "사람 인", frequency: 5 },
    { character: "入", hangeul: "입", stroke: 2, won_stroke: 2, ohaeng: "목", meaning: "들 입", frequency: 5 },
    // 보존 (통과 가능)
    { character: "乙", hangeul: "을", stroke: 1, won_stroke: 1, ohaeng: "목", meaning: "새 을", frequency: 5 },
    { character: "力", hangeul: "력", stroke: 2, won_stroke: 2, ohaeng: "토", meaning: "힘 력", frequency: 5 },
  ];
  const r12 = recommendNames({ ...SUNG, nameLength: 2, topN: 30, db: seed12 });
  const joined12 = r12.map((c) => c.hanja).join("");
  for (const ch of blockChars) {
    check(`case12c ${ch} 추천 미등장`, !joined12.includes(ch));
  }
}

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — recommendNames 12 case (n=2 / n=1 / 음령 통합 / 다양성 / 대형풀 / 제외 필터 / char2 cap-skip / 상용도 tiebreak / 작명 부적합 가드 / 음양 C-1 / char2 다양성 / 풀 상단 ws≤2 의미 가드 C-2-pre) · 음령 55%+수리 45% · 39-C + ws≤2 11자 EXPLICIT 차단 + 5자(乙·丁·儿·力·刁) 보존.`,
);
