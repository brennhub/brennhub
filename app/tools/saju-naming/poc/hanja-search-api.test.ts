/**
 * /api/saju-naming/hanja-search 입력 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/hanja-search-api.test.ts
 *
 * D1 happy path는 검증 안 함 (binding 부재 환경).
 * 실 D1 흐름은 dev.brennhub.com 배포 후 curl로 사후 검증.
 */

import { GET } from "../../../api/saju-naming/hanja-search/route";

async function callApi(queryString: string): Promise<{
  status: number;
  data: { code?: string; field?: string; error?: string };
}> {
  const url = `http://localhost/api/saju-naming/hanja-search${queryString ? `?${queryString}` : ""}`;
  const req = new Request(url, { method: "GET" });
  const res = await GET(req);
  const data = (await res.json()) as {
    code?: string;
    field?: string;
    error?: string;
  };
  return { status: res.status, data };
}

const failures: string[] = [];
function check(label: string, cond: boolean, detail?: string) {
  if (!cond) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

async function run() {
  // 케이스 1: ohaeng=invalid (목/화/토/금/수 외)
  const r1 = await callApi("ohaeng=불");
  check("400 INVALID_INPUT ohaeng", r1.status === 400 && r1.data.code === "INVALID_INPUT" && r1.data.field === "ohaeng", `code=${r1.data.code} field=${r1.data.field}`);

  // 케이스 2: strokeMin=abc (parse 실패)
  const r2 = await callApi("strokeMin=abc");
  check("400 INVALID_INPUT strokeMin", r2.status === 400 && r2.data.code === "INVALID_INPUT" && r2.data.field === "strokeMin", `code=${r2.data.code} field=${r2.data.field}`);

  // 케이스 3: limit=500 (max=200)
  const r3 = await callApi("limit=500");
  check("400 OUT_OF_RANGE limit", r3.status === 400 && r3.data.code === "OUT_OF_RANGE" && r3.data.field === "limit", `code=${r3.data.code} field=${r3.data.field}`);

  // 케이스 4: offset=-1
  const r4 = await callApi("offset=-1");
  check("400 OUT_OF_RANGE offset", r4.status === 400 && r4.data.code === "OUT_OF_RANGE" && r4.data.field === "offset", `code=${r4.data.code} field=${r4.data.field}`);

  // 케이스 5: strokeMin > strokeMax
  const r5 = await callApi("strokeMin=20&strokeMax=10");
  check("400 OUT_OF_RANGE strokeMin>strokeMax", r5.status === 400 && r5.data.code === "OUT_OF_RANGE" && r5.data.field === "strokeMin", `code=${r5.data.code} field=${r5.data.field}`);

  if (failures.length === 0) {
    console.log("✅ /api/hanja-search 입력 검증 5/5 통과");
    console.log("  실 D1 happy path는 dev.brennhub.com 배포 후 curl로 검증.");
  } else {
    console.error("❌ 검증 실패");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("❌ 예외:", e);
  process.exit(1);
});
