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
import { isExcludedFromRecommend, isRareBlock } from "../lib/name-exclude";

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
const mk = (hangeul: string, totalScore: number): NameCandidate => ({
  hanja: "?",
  hangeul,
  strokes: [],
  ohaengList: [],
  soundOhaengList: [],
  surieScore: 0,
  soundScore: 0,
  totalScore,
  breakdown: "",
});
const byFirst = new Map<string, NameCandidate[]>([
  ["수", [mk("수아", 97), mk("수호", 96), mk("수민", 95)]],
  ["가", [mk("가람", 90)]],
  ["나", [mk("나래", 88)]],
]);
const picked = selectDiverse(byFirst, 3);
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
const HANGEUL_POOL = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차"];
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

if (failures.length > 0) {
  console.error(`PoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `PoC 통과 — recommendNames 6 case (n=2 / n=1 / 음령 통합 / 다양성 / 대형풀 / 제외 필터) · 음령 55%+수리 45% · 39-C 품질 가드.`,
);
