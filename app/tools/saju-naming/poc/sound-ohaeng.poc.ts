/**
 * 음령오행 (lib/sound-ohaeng.ts) PoC 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/sound-ohaeng.poc.ts
 *
 * 검증:
 *   1. 상생/상극 관계 (relateOhaeng).
 *   2. 음절 분해 — 초성/종성 추출 + 학파별 오행.
 *   3. A학설(초성) 채점 — 상생/상극 체인.
 *   4. B학설 받침 브릿지 — 초성 상극이 종성으로 상생화.
 *   5. C학설 — A·B 평균.
 *   6. 엣지 — 1글자/비한글 → 중립 50.
 */

import {
  relateOhaeng,
  decomposeSyllable,
  evaluateSoundOhaeng,
} from "../lib/sound-ohaeng";

const failures: string[] = [];
function check(label: string, cond: boolean): void {
  if (!cond) failures.push(label);
}

// 1. 상생/상극
check("목→화 상생", relateOhaeng("목", "화") === "상생");
check("수→목 상생 (수생목)", relateOhaeng("수", "목") === "상생");
check("목→토 상극 (목극토)", relateOhaeng("목", "토") === "상극");
check("금→목 상극 (금극목)", relateOhaeng("금", "목") === "상극");
check("목→목 비화", relateOhaeng("목", "목") === "비화");

// 2. 음절 분해
const kim = decomposeSyllable("김", "tongyong");
check("김 초성 ㄱ", kim.choseong === "ㄱ");
check("김 초성오행 목", kim.choseongOhaeng === "목");
check("김 종성 ㅁ", kim.jongseong === "ㅁ");
check("김 종성오행 수 (tongyong)", kim.jongseongOhaeng === "수");
const lee = decomposeSyllable("이", "tongyong");
check("이 초성 ㅇ → 토 (tongyong)", lee.choseongOhaeng === "토");
check("이 종성 없음", lee.jongseong === null);
// 학파 토글 — 박 초성 ㅂ(脣音)
check(
  "박 ㅂ tongyong → 수",
  decomposeSyllable("박", "tongyong").choseongOhaeng === "수",
);
check(
  "박 ㅂ hunminjeongeum → 토",
  decomposeSyllable("박", "hunminjeongeum").choseongOhaeng === "토",
);
check(
  "이 ㅇ hunminjeongeum → 수",
  decomposeSyllable("이", "hunminjeongeum").choseongOhaeng === "수",
);

// 3. A학설 — 초성 상생/상극
//   가(목)·나(화)·아(토) → 목생화·화생토 → 상생·상생 → 100
const r3a = evaluateSoundOhaeng(["가", "나", "아"]);
check("A학설 상생 체인 100", r3a.score === 100);
//   가(목)·아(토) → 목극토 → 상극 → 0
const r3b = evaluateSoundOhaeng(["가", "아"]);
check("A학설 상극 체인 0", r3b.score === 0);
//   가(목)·가(목) → 비화 → 50
const r3c = evaluateSoundOhaeng(["가", "가"]);
check("A학설 비화 체인 50", r3c.score === 50);

// 4. B학설 받침 브릿지
//   삼(초성 ㅅ=금 / 종성 ㅁ=수)·구(초성 ㄱ=목)
//   A: [금,목] → 금극목 → 0
//   B: [금,수,목] → 금생수·수생목 → 상생·상생 → 100  (종성 수가 브릿지)
const bridgeA = evaluateSoundOhaeng(["삼", "구"], { ruleset: "choseong" });
const bridgeB = evaluateSoundOhaeng(["삼", "구"], {
  ruleset: "with-jongseong",
});
check("브릿지 전 A학설 = 0 (금극목)", bridgeA.score === 0);
check("브릿지 후 B학설 = 100 (종성 수 브릿지)", bridgeB.score === 100);

// 5. C학설 — A·B 평균
const r5 = evaluateSoundOhaeng(["삼", "구"], { ruleset: "both" });
check("C학설 = (0+100)/2 = 50", r5.score === 50);

// 6. 엣지
check("1글자 → 중립 50", evaluateSoundOhaeng(["가"]).score === 50);
check("비한글 → 중립 50", evaluateSoundOhaeng(["A", "B"]).score === 50);

// ── 채점 예시 출력 (보고용) ──
console.log("─ 채점 예시 ─");
for (const name of [
  ["김", "나", '아'],
  ["김", "민", "준"],
  ["박", "서", "연"],
  ["삼", "구"],
]) {
  const a = evaluateSoundOhaeng(name);
  const c = evaluateSoundOhaeng(name, { ruleset: "both" });
  console.log(`  ${name.join("")} → A: ${a.detail}`);
  console.log(`  ${" ".repeat(name.join("").length)}   C: ${c.detail}`);
}

if (failures.length > 0) {
  console.error(`\nPoC 실패 ${failures.length}건:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `\nPoC 통과 — 상생/상극 · 음절분해 · A/B/C 학설 · 받침 브릿지 · 학파 토글 · 엣지.`,
);
