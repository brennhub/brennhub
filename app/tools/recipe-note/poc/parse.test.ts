/**
 * 레시피 파서 검증 — 기획서 §4 규칙 전부.
 *
 * 실행: npx tsx app/tools/recipe-note/poc/parse.test.ts
 *
 * repo에 테스트 러너가 없다 (vitest/jest 미도입). saju-naming poc과 같은
 * 방식 — 순수 함수를 tsx로 직접 돌리고 ✓/✗를 센다. 파서가 D1·Workers 전역을
 * 참조하지 않는 이유가 이것이다.
 */

import {
  ingredientKind,
  parseIngredientLine,
  parseSteps,
  parseTimerSec,
  stepIngredientIndexes,
} from "@/lib/recipe-note/parse";
import { formatQty, scaleRangeText, scaledAmount } from "@/lib/recipe-note/scale";
import type { Ingredient } from "@/lib/recipe-note/types";

let passed = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}\n      기대: ${e}\n      실제: ${a}`);
    console.log(`  ✗ ${label}  기대 ${e} / 실제 ${a}`);
  }
}

function ing(line: string): Ingredient | null {
  return parseIngredientLine(line);
}

/** 비교를 짧게 — {name, qty, qtyText, unit, raw} 튜플. */
function tuple(line: string) {
  const i = ing(line);
  if (!i) return null;
  return [i.name, i.qty, i.qtyText, i.unit, i.raw];
}

console.log("\n§4-1 재료 라인 — 정량 (이름 + 수량 + 단위)");
check("돼지고기 목살 300g", tuple("돼지고기 목살 300g"), [
  "돼지고기 목살",
  300,
  null,
  "g",
  null,
]);
check("띄어쓴 단위", tuple("물 500 ml"), ["물", 500, null, "ml", null]);
check("붙여쓴 이름+수량", tuple("물500ml"), ["물", 500, null, "ml", null]);
check("소수", tuple("소금 0.5큰술"), ["소금", 0.5, null, "큰술", null]);
check("분수", tuple("올리브유 1/4컵"), ["올리브유", 0.25, null, "컵", null]);
check("대문자 단위 정규화", tuple("우유 200ML"), ["우유", 200, null, "ml", null]);
check("큰술 T", tuple("설탕 2T"), ["설탕", 2, null, "T", null]);
check("작은술 t", tuple("소금 1t"), ["소금", 1, null, "t", null]);
check("긴 단위 우선 (봉지≠봉)", tuple("라면 2봉지"), [
  "라면",
  2,
  null,
  "봉지",
  null,
]);
check("긴 단위 우선 (kg≠g)", tuple("밀가루 1kg"), [
  "밀가루",
  1,
  null,
  "kg",
  null,
]);

console.log("\n§4-1 재료 라인 — 한글 수사");
check("한 줌", tuple("대파 한 줌"), ["대파", 1, null, "줌", null]);
check("반 포기", tuple("배추 반 포기"), ["배추", 0.5, null, "포기", null]);
check("두 큰술", tuple("고추장 두 큰술"), ["고추장", 2, null, "큰술", null]);
check("세 개", tuple("계란 세 개"), ["계란", 3, null, "개", null]);
check("열 알", tuple("마늘 열 알"), ["마늘", 10, null, "알", null]);
check("여덟 개", tuple("새우 여덟 개"), ["새우", 8, null, "개", null]);

console.log("\n§4-1 재료 라인 — 범위");
check("2~3개", tuple("청양고추 2~3개"), [
  "청양고추",
  null,
  "2~3",
  "개",
  null,
]);
check("2-3개 (하이픈)", tuple("청양고추 2-3개"), [
  "청양고추",
  null,
  "2-3",
  "개",
  null,
]);
check("범위 + 단위 없음", tuple("계란 2~3"), ["계란", null, "2~3", null, null]);

console.log("\n§4-1 재료 라인 — 감각량 · 이름만 · 단위 없는 수량");
check("감각량", tuple("소금 약간"), ["소금", null, null, null, "약간"]);
check("감각량 (조금)", tuple("통깨 조금"), ["통깨", null, null, null, "조금"]);
check("이름만", tuple("대파"), ["대파", null, null, null, null]);
check("두 단어 이름 + 감각량", tuple("다진 마늘 약간"), [
  "다진 마늘",
  null,
  null,
  null,
  "약간",
]);
check("단위 없는 숫자", tuple("계란 3"), ["계란", 3, null, null, null]);
check("사전에 없는 단위는 raw로", tuple("밥 2공기"), [
  "밥",
  null,
  null,
  null,
  "2공기",
]);
// 미지의 단위여도 **양 표현 전체**가 raw로 간다. 이름에 숫자가 눌어붙으면
// §4-4 단계 매칭이 "500번 젓는다" 같은 문장에 걸린다.
check("미지 단위 (띄어쓰기)", tuple("물 500 그램"), [
  "물",
  null,
  null,
  null,
  "500 그램",
]);
check("미지 단위 + 한글 수사", tuple("고기 한 근"), [
  "고기",
  null,
  null,
  null,
  "한 근",
]);
check("미지 단위 (자밤)", tuple("소금 한 자밤"), [
  "소금",
  null,
  null,
  null,
  "한 자밤",
]);

console.log("\n§4-1 오탐 방어 — 이름 속 숫자를 수량으로 읽지 않는다");
check("비타민B12", tuple("비타민B12"), ["비타민B12", null, null, null, null]);
check("오메가3", tuple("오메가3"), ["오메가3", null, null, null, null]);
check("오메가3 + 실제 수량", tuple("오메가3 1큰술"), [
  "오메가3",
  1,
  null,
  "큰술",
  null,
]);
check("이름 없는 300g", tuple("300g"), ["300g", null, null, null, null]);
check("빈 줄", ing("   "), null);

console.log("\n§4-1 분류 (라이브 힌트용)");
check("정량 분류", ingredientKind(ing("물 500ml")!), "quantified");
check("범위도 정량 분류", ingredientKind(ing("고추 2~3개")!), "quantified");
check("감각량 분류", ingredientKind(ing("소금 약간")!), "sensory");
check("이름만 분류", ingredientKind(ing("대파")!), "name-only");

console.log("\n§4-2 환산 표기 — 근사 분수 우선");
check("정수", formatQty(300), "300");
check("1/2", formatQty(0.5), "1/2");
check("1/4", formatQty(0.25), "1/4");
check("1/3", formatQty(1 / 3), "1/3");
check("2/3", formatQty(2 / 3), "2/3");
check("3/4", formatQty(0.75), "3/4");
check("대분수 2 1/2", formatQty(2.5), "2 1/2");
check("허용오차 밖은 소수 2자리", formatQty(0.375), "0.38");
check("부동소수 찌꺼기는 반올림이 흡수", formatQty(2.999), "3");
check("소수 반올림", formatQty(1.005), "1");
check("허용오차 밖 근사 정수는 그대로", formatQty(0.98), "0.98");
check("1/4 허용오차 안", formatQty(0.26), "1/4");
check("1/3 허용오차 안", formatQty(0.32), "1/3");
check("진짜 0", formatQty(0), "0");
check("아주 작은 양을 0이라 쓰지 않는다", formatQty(0.02), "0.02");
check("더 작은 양도 0이 아니다", formatQty(0.001), "0.001");
check("작은 양 ×0.5", scaledAmount(ing("이스트 0.04g")!, 0.5).text, "0.02 g");
check("1/3 × 3 = 1", formatQty((1 / 3) * 3), "1");

console.log("\n§4-2 배율 환산 — 정량만, 감각량은 원문 유지");
check("정량 ×2", scaledAmount(ing("물 500ml")!, 2), {
  text: "1000 ml",
  scaled: true,
});
check("정량 ×0.5", scaledAmount(ing("물 500ml")!, 0.5), {
  text: "250 ml",
  scaled: true,
});
check("한글 수사도 환산 대상", scaledAmount(ing("대파 한 줌")!, 2), {
  text: "2 줌",
  scaled: true,
});
check("범위 양 끝 각각", scaledAmount(ing("청양고추 2~3개")!, 2), {
  text: "4~6 개",
  scaled: true,
});
check("감각량은 배율 무시", scaledAmount(ing("소금 약간")!, 3), {
  text: "약간",
  scaled: false,
});
check("이름만은 빈 문자열", scaledAmount(ing("대파")!, 3), {
  text: "",
  scaled: false,
});
check("×1은 scaled 아님", scaledAmount(ing("물 500ml")!, 1), {
  text: "500 ml",
  scaled: false,
});
check("분수 환산 표기", scaledAmount(ing("배추 반 포기")!, 3), {
  text: "1 1/2 포기",
  scaled: true,
});
check("범위 하이픈 보존", scaleRangeText("2-3", 2), "4-6");

console.log("\n§4-3 타이머 파싱");
check("N분", parseTimerSec("중불에서 10분 볶는다"), 600);
check("N초", parseTimerSec("30초간 데친다"), 30);
check("N시간", parseTimerSec("1시간 끓인다"), 3600);
check("N분 M초", parseTimerSec("10분 30초 삶는다"), 630);
check("N시간 M분", parseTimerSec("1시간 30분 조린다"), 5400);
check("범위는 앞 값", parseTimerSec("5~10분 볶는다"), 300);
check("소수", parseTimerSec("1.5시간 재운다"), 5400);
check("첫 매칭 1개만", parseTimerSec("10분 볶고 20분 더 끓인다"), 600);
check("시간 없음", parseTimerSec("파를 송송 썬다"), null);
check("'3분의 1' 오탐 방어", parseTimerSec("양념 3분의 1을 붓는다"), null);
check("'1인분' 오탐 방어", parseTimerSec("1인분씩 담는다"), null);

console.log("\n§4-3 순서 분리");
check(
  "엔터 = 단계 분리 + 빈 줄 무시",
  parseSteps("파를 썬다\n\n중불에서 10분 볶는다\n"),
  [
    { text: "파를 썬다", timerSec: null },
    { text: "중불에서 10분 볶는다", timerSec: 600 },
  ],
);

console.log("\n§4-4 단계별 재료 매칭");
{
  const list = [
    ing("돼지고기 목살 300g")!,
    ing("대파 한 줌")!,
    ing("소금 약간")!,
  ];
  check(
    "이름 마지막 토큰 매칭 (목살)",
    stepIngredientIndexes("목살을 먼저 굽는다", list),
    [0],
  );
  check(
    "이름 전체 매칭",
    stepIngredientIndexes("돼지고기 목살을 굽는다", list),
    [0],
  );
  check("복수 매칭", stepIngredientIndexes("대파와 소금을 넣는다", list), [1, 2]);
  check("매칭 없음", stepIngredientIndexes("10분 기다린다", list), []);
}

console.log(
  `\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failures.length} failed`,
);
if (failures.length > 0) {
  console.log("\n실패 목록:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
