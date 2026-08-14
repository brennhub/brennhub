/**
 * 레시피 파서 검증 — 원문 보존 모델.
 *
 * 실행: npx tsx app/tools/recipe-note/poc/parse.test.ts
 *
 * repo에 테스트 러너가 없다 (vitest/jest 미도입). saju-naming poc과 같은
 * 방식 — 순수 함수를 tsx로 직접 돌리고 ✓/✗를 센다.
 *
 * 이 파일의 제1 관심사는 **원문이 한 글자도 안 바뀌는 것**이고, 제2가 후보
 * 검출의 정확성이다. 누락은 수동 지정으로 복구되지만, 오탐이 자동 선택까지
 * 가면 배율을 바꾸는 순간 원문이 조용히 망가진다 — 오탐 회귀 케이스가 많은 이유.
 */

import {
  findQtyCandidates,
  makeIngredient,
  parseManualSpan,
  parseSteps,
  parseTimerSec,
  stepIngredientIndexes,
} from "@/lib/recipe-note/parse";
import { formatQty, scaleIngredientText } from "@/lib/recipe-note/scale";
import { validateRecipeInput } from "@/lib/recipe-note/record";
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

/** 후보를 [토큰원문, start, end, qty, qtyText, unit] 튜플로 압축. */
function cands(text: string) {
  return findQtyCandidates(text).map((c) => [
    text.slice(c.start, c.end),
    c.start,
    c.end,
    c.qty,
    c.qtyText,
    c.unit,
  ]);
}

console.log("\n필수 케이스 — 실사용에서 깨졌던 줄들");
check("만능 큐브삼겹살 (1kg) — 괄호 제외 오프셋", cands("만능 큐브삼겹살 (1kg)"), [
  ["1kg", 10, 13, 1, null, "kg"],
]);
check("뜨거운 물 — 후보 없음", cands("뜨거운 물"), []);
check("잘게 자른 김치 — 후보 없음", cands("잘게 자른 김치"), []);
check(
  "소면 먹을만큼 (500원 동전크기 — 원은 사전 밖, 안 닫힌 괄호 무해",
  cands("소면 먹을만큼 (500원 동전크기"),
  [],
);
check("청양고추 2~3개 — 범위 통째로", cands("청양고추 2~3개"), [
  ["2~3개", 5, 9, null, "2~3", "개"],
]);
check("대파 한 줌 — 한글 수사 + 공백", cands("대파 한 줌"), [
  ["한 줌", 3, 6, 1, null, "줌"],
]);

console.log("\n원문 보존 — makeIngredient는 글자를 바꾸지 않는다");
for (const line of [
  "만능 큐브삼겹살 (1kg)",
  "뜨거운 물",
  "잘게 자른 김치",
  "소면 먹을만큼 (500원 동전크기",
  "청양고추 2~3개",
  "대파 한 줌",
  "소금 약간",
]) {
  check(`원문 유지: ${line}`, makeIngredient(line)?.text, line);
}
check("연속 공백만 1회 정규화", makeIngredient("  대파   한 줌 ")?.text, "대파 한 줌");
check("빈 줄", makeIngredient("   "), null);

console.log("\n자동 선택 — 후보 1개만");
check("후보 1개 → 자동 선택", makeIngredient("대파 한 줌")?.sel?.unit, "줌");
check("후보 0개 → 미선택", makeIngredient("뜨거운 물")?.sel, null);
check(
  "후보 2개 → 미선택 (사용자가 고른다)",
  makeIngredient("생크림 200ml (1컵)")?.sel,
  null,
);
check("후보 2개 확인", cands("생크림 200ml (1컵)").length, 2);

console.log("\n오탐 회귀 — 자동 선택까지 가면 원문이 망가지는 것들");
check("물 1,000ml — 쉼표 뒤 000을 수량으로 읽지 않는다", cands("물 1,000ml"), []);
check("3개월 숙성 김치 — 개월", cands("3개월 숙성 김치"), []);
check("묵은지 (6개월 이상) — 개월", cands("묵은지 (6개월 이상)"), []);
check("양념 2단계로 나눠 넣기 — 단계", cands("양념 2단계로 나눠 넣기"), []);
check("두부 세모 모양으로 — 실재 명사", cands("두부 세모 모양으로"), []);
check("세척한 대파 — 어절 안의 수사", cands("세척한 대파"), []);
check("네모난 두부 — 수사 뒤 한글", cands("네모난 두부"), []);
check("두반장 1큰술 — 반장이 아니라 1큰술", cands("두반장 1큰술"), [
  ["1큰술", 4, 7, 1, null, "큰술"],
]);
check("비타민B12 — 영문 뒤 숫자", cands("비타민B12"), []);
check("오메가3 — 단위 없는 꼬리 숫자", cands("오메가3"), []);
check("한입 크기로 썬 무 — 한입", cands("한입 크기로 썬 무"), []);

console.log("\n검출은 유지되어야 하는 것들");
check("삼겹살 300g짜리 — 숫자 뒤 한글은 허용", cands("삼겹살 300g짜리"), [
  ["300g", 4, 8, 300, null, "g"],
]);
check("물500ml — 붙여쓰기", cands("물500ml"), [["500ml", 1, 6, 500, null, "ml"]]);
check("밀가루 1 1/2컵 — 대분수", cands("밀가루 1 1/2컵"), [
  ["1 1/2컵", 4, 10, 1.5, null, "컵"],
]);
check("올리브유 1/4컵 — 분수", cands("올리브유 1/4컵"), [
  ["1/4컵", 5, 9, 0.25, null, "컵"],
]);
check("우유 200ML — 단위 원문 보존 (정규화 X)", cands("우유 200ML"), [
  ["200ML", 3, 8, 200, null, "ML"],
]);
check("설탕 2T — 대문자 T는 큰술", cands("설탕 2T"), [
  ["2T", 3, 5, 2, null, "T"],
]);
check("배추 반 포기", cands("배추 반 포기"), [["반 포기", 3, 7, 0.5, null, "포기"]]);
check("라면 2봉지 — 긴 단위 우선", cands("라면 2봉지"), [
  ["2봉지", 3, 6, 2, null, "봉지"],
]);

console.log("\n수동 지정 — 사전을 보지 않는다");
{
  const text = "물 500 그램";
  check("사전 밖 단위", parseManualSpan(text, 2, text.length), {
    start: 2,
    end: 8,
    qty: 500,
    qtyText: null,
    unit: "그램",
  });
}
check("단위 없는 수량", parseManualSpan("계란 3", 3, 4), {
  start: 3,
  end: 4,
  qty: 3,
  qtyText: null,
  unit: "",
});
check("양끝 괄호 트림", parseManualSpan("삼겹살 (1kg)", 4, 9), {
  start: 5,
  end: 8,
  qty: 1,
  qtyText: null,
  unit: "kg",
});
check("수량이 아닌 구간", parseManualSpan("뜨거운 물", 0, 3), null);
check("빈 구간", parseManualSpan("대파", 2, 2), null);

console.log("\n제자리 환산 — 확정 구간만 바뀐다");
{
  const ing = makeIngredient("만능 큐브삼겹살 (1kg)")!;
  check("×2 제자리 치환", scaleIngredientText(ing, 2), {
    before: "만능 큐브삼겹살 (",
    amount: "2kg",
    after: ")",
    scaled: true,
  });
  check("×1은 재구성 없이 원문", scaleIngredientText(ing, 1), {
    before: "만능 큐브삼겹살 (1kg)",
    amount: "",
    after: "",
    scaled: false,
  });
}
check("공백 구분자 보존", scaleIngredientText(makeIngredient("대파 한 줌")!, 2), {
  before: "대파 ",
  amount: "2 줌",
  after: "",
  scaled: true,
});
check("범위 양 끝 각각", scaleIngredientText(makeIngredient("청양고추 2~3개")!, 2), {
  before: "청양고추 ",
  amount: "4~6개",
  after: "",
  scaled: true,
});
check(
  "단위 원문 표기까지 보존",
  scaleIngredientText(makeIngredient("우유 200ML")!, 2).amount,
  "400ML",
);
check("sel 없으면 배율 무시", scaleIngredientText(makeIngredient("소금 약간")!, 3), {
  before: "소금 약간",
  amount: "",
  after: "",
  scaled: false,
});
check(
  "수동 지정 구간도 환산",
  scaleIngredientText(
    { text: "물 500 그램", sel: parseManualSpan("물 500 그램", 2, 8) },
    2,
  ).amount,
  "1000 그램",
);

console.log("\n소수 수량 — 회귀 고정");
/**
 * 소수는 후보 탐지 → 수동 지정 → 구조 검증 → 환산 어디서도 떨어지면 안 된다.
 * 떨어지면 배율만 조용히 안 먹고 에러가 없어 사용자가 알아챌 방법이 없다.
 *
 * 특히 구조 검증에서 `Number.isInteger`는 **오프셋(start/end)에만** 걸린다.
 * 이걸 qty로 옮기는 순간 0.5가 전부 죽는다 — 아래 라운드트립이 그 파수꾼이다.
 */
check("후보: 설탕 0.5컵", cands("설탕 0.5컵"), [
  ["0.5컵", 3, 7, 0.5, null, "컵"],
]);
check("후보: 고기 1.5kg", cands("고기 1.5kg"), [
  ["1.5kg", 3, 8, 1.5, null, "kg"],
]);
check("후보: 올리브유 0.25컵", cands("올리브유 0.25컵"), [
  ["0.25컵", 5, 10, 0.25, null, "컵"],
]);
check("후보: 설탕 0.5 컵 (띄어쓰기)", cands("설탕 0.5 컵"), [
  ["0.5 컵", 3, 8, 0.5, null, "컵"],
]);
check("후보: 물 0.5~1컵 (범위 소수)", cands("물 0.5~1컵"), [
  ["0.5~1컵", 2, 8, null, "0.5~1", "컵"],
]);
check("수동 지정: 0.5컵", parseManualSpan("설탕 0.5컵", 3, 7), {
  start: 3,
  end: 7,
  qty: 0.5,
  qtyText: null,
  unit: "컵",
});
check("수동 지정: 소수 + 사전 밖 단위", parseManualSpan("물 0.5 그램", 2, 8), {
  start: 2,
  end: 8,
  qty: 0.5,
  qtyText: null,
  unit: "그램",
});

/** 저장 → JSON 직렬화 → 재로드 → 구조 검증. 살아 돌아온 sel만 돌려준다. */
function roundTrip(ing: Ingredient): Ingredient | string {
  const body: unknown = JSON.parse(
    JSON.stringify({
      title: "t",
      ingredients: [ing],
      steps: [{ text: "s", timerSec: null }],
    }),
  );
  const result = validateRecipeInput(body);
  return result.ok ? result.value.ingredients[0] : `REJECTED(${result.error.code})`;
}

{
  const saved = roundTrip(makeIngredient("설탕 0.5컵")!) as Ingredient;
  check("라운드트립: 소수 qty가 살아남는다", saved.sel?.qty, 0.5);
  check("라운드트립: 원문 보존", saved.text, "설탕 0.5컵");
  check("라운드트립 후 ×2 환산", scaleIngredientText(saved, 2).amount, "1컵");
}
{
  const saved = roundTrip(makeIngredient("물 0.5~1컵")!) as Ingredient;
  check("라운드트립: 소수 범위 qtyText", saved.sel?.qtyText, "0.5~1");
  check("라운드트립 후 ×2 환산 (범위)", scaleIngredientText(saved, 2).amount, "1~2컵");
}
{
  // 수동 지정 경로 — 사전 밖 단위 + 소수. 여기가 가장 깨지기 쉽다.
  const manual: Ingredient = {
    text: "물 0.5 그램",
    sel: parseManualSpan("물 0.5 그램", 2, 8),
  };
  const saved = roundTrip(manual) as Ingredient;
  check("라운드트립: 수동 소수 qty", saved.sel?.qty, 0.5);
  check("라운드트립: 수동 사전 밖 단위", saved.sel?.unit, "그램");
  check(
    "라운드트립 후 ×2 환산 (수동)",
    scaleIngredientText(saved, 2).amount,
    "1 그램",
  );
}

/** 구조 검증 경계 — 오프셋은 정수, 수량은 소수 허용. 둘의 요구가 다르다. */
function selAfterValidate(sel: unknown): unknown {
  const out = roundTrip({ text: "설탕 0.5컵", sel } as Ingredient);
  return typeof out === "string" ? out : out.sel;
}
check(
  "검증: qty 0.5 통과",
  selAfterValidate({ start: 3, end: 7, qty: 0.5, qtyText: null, unit: "컵" }),
  { start: 3, end: 7, qty: 0.5, qtyText: null, unit: "컵" },
);
check(
  "검증: 오프셋이 소수면 거부",
  selAfterValidate({ start: 3.5, end: 7, qty: 0.5, qtyText: null, unit: "컵" }),
  null,
);
check(
  "검증: qty 음수 거부",
  selAfterValidate({ start: 3, end: 7, qty: -0.5, qtyText: null, unit: "컵" }),
  null,
);
check(
  "검증: qty NaN 거부",
  selAfterValidate({ start: 3, end: 7, qty: NaN, qtyText: null, unit: "컵" }),
  null,
);
check(
  "검증: 범위 밖 end 거부",
  selAfterValidate({ start: 3, end: 999, qty: 0.5, qtyText: null, unit: "컵" }),
  null,
);
check(
  "검증: unit 불일치 거부",
  selAfterValidate({ start: 3, end: 7, qty: 0.5, qtyText: null, unit: "g" }),
  null,
);

check("소수 ×1.5", scaleIngredientText(makeIngredient("설탕 0.5컵")!, 1.5).amount, "3/4컵");
check("소수 ×3", scaleIngredientText(makeIngredient("설탕 0.5컵")!, 3).amount, "1 1/2컵");
check("소수 ×2", scaleIngredientText(makeIngredient("고기 1.5kg")!, 2).amount, "3kg");
check(
  "범위 소수 ×1.5",
  scaleIngredientText(makeIngredient("물 0.5~1컵")!, 1.5).amount,
  "3/4~1 1/2컵",
);
check("대분수 ×2", scaleIngredientText(makeIngredient("밀가루 1 1/2컵")!, 2).amount, "3컵");

// 앞자리 0을 생략한 ".5컵"은 의도적으로 미지원 — 숫자 앞 `.` 차단이
// "물 1,000ml" → "000ml"(qty 0) 오탐을 막는 바로 그 가드다 (BACKLOG).
check("미지원 고정: .5작은술은 후보 0개", cands("소금 .5작은술"), []);
check("미지원 고정: .5는 수동 지정도 불가", parseManualSpan("소금 .5작은술", 3, 8), null);

console.log("\n환산 표기 — 근사 분수");
check("정수", formatQty(300), "300");
check("1/2", formatQty(0.5), "1/2");
check("대분수 2 1/2", formatQty(2.5), "2 1/2");
check("허용오차 밖은 소수 2자리", formatQty(0.375), "0.38");
check("허용오차 밖 근사 정수는 그대로", formatQty(0.98), "0.98");
check("부동소수 찌꺼기는 반올림이 흡수", formatQty(2.999), "3");
check("아주 작은 양을 0이라 쓰지 않는다", formatQty(0.001), "0.001");
check(
  "×1.5 범위",
  scaleIngredientText(makeIngredient("청양고추 2~3개")!, 1.5).amount,
  "3~4 1/2개",
);

console.log("\n타이머 파싱");
check("N분", parseTimerSec("중불에서 10분 볶는다"), 600);
check("N초", parseTimerSec("30초간 데친다"), 30);
check("N분 M초", parseTimerSec("10분 30초 삶는다"), 630);
check("N시간 M분", parseTimerSec("1시간 30분 조린다"), 5400);
check("범위는 앞 값", parseTimerSec("5~10분 볶는다"), 300);
check("첫 매칭 1개만", parseTimerSec("10분 볶고 20분 더 끓인다"), 600);
check("시간 없음", parseTimerSec("파를 송송 썬다"), null);
check("'3분의 1' 오탐 방어", parseTimerSec("양념 3분의 1을 붓는다"), null);
check("'1인분' 오탐 방어", parseTimerSec("1인분씩 담는다"), null);
check(
  "엔터 = 단계 분리 + 빈 줄 무시",
  parseSteps("파를 썬다\n\n중불에서 10분 볶는다\n"),
  [
    { text: "파를 썬다", timerSec: null },
    { text: "중불에서 10분 볶는다", timerSec: 600 },
  ],
);

console.log("\n단계별 재료 매칭");
{
  const list = [
    makeIngredient("만능 큐브삼겹살 (1kg)")!,
    makeIngredient("대파 한 줌")!,
    makeIngredient("소금 약간")!,
  ];
  check("접미사 매칭 (큐브삼겹살 ⊃ 삼겹살)", stepIngredientIndexes("삼겹살을 굽는다", list), [0]);
  check("전체 어절 매칭", stepIngredientIndexes("큐브삼겹살을 굽는다", list), [0]);
  check("수량 구간은 이름에서 빠진다", stepIngredientIndexes("1kg을 넣는다", list), []);
  check("복수 매칭", stepIngredientIndexes("대파와 소금을 넣는다", list), [1, 2]);
  check("매칭 없음", stepIngredientIndexes("10분 기다린다", list), []);
  check(
    "감각량 꼬리말은 이름이 아니다",
    stepIngredientIndexes("약간의 물을 넣는다", list),
    [],
  );
}
{
  const list = [makeIngredient("돼지고기 목살 300g")!, makeIngredient("대파 한 줌")!];
  check("목살 매칭", stepIngredientIndexes("목살을 먼저 굽는다", list), [0]);
  check("숫자만 남은 어절은 매칭 안 함", stepIngredientIndexes("300번 젓는다", list), []);
}

console.log(
  `\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failures.length} failed`,
);
if (failures.length > 0) {
  console.log("\n실패 목록:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
