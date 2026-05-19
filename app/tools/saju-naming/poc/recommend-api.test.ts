/**
 * /api/saju-naming/recommend 입력 검증.
 *
 * 실행: npx tsx app/tools/saju-naming/poc/recommend-api.test.ts
 *
 * D1 happy path는 검증 안 함 (binding 부재 환경, supp-plan 패턴 일관).
 * 실 D1 흐름은 dev.brennhub.com 배포 후 curl로 사후 검증.
 *
 * 본 PoC는 input validation 4 케이스만 (route는 D1 도달 전 실패).
 */

import { POST } from "../../../api/saju-naming/recommend/route";

async function callApi(body: unknown): Promise<{
  status: number;
  data: { code?: string; field?: string; error?: string };
}> {
  const req = new Request("http://localhost/api/saju-naming/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await POST(req);
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
  // 케이스 1: malformed JSON
  const r1 = await callApi("{not json");
  check("400 INVALID_JSON", r1.status === 400 && r1.data.code === "INVALID_JSON", `status=${r1.status} code=${r1.data.code}`);

  // 케이스 2: sungStroke 누락 → INVALID_INPUT
  const r2 = await callApi({
    sungHanja: "林",
    yongsin: ["수"],
    gisin: ["금"],
    nameLength: 2,
  });
  check("400 INVALID_INPUT sungStroke", r2.status === 400 && r2.data.code === "INVALID_INPUT" && r2.data.field === "sungStroke", `code=${r2.data.code} field=${r2.data.field}`);

  // 케이스 3: nameLength=3 (invalid)
  const r3 = await callApi({
    sungHanja: "林",
    sungStroke: 8,
    yongsin: ["수"],
    gisin: ["금"],
    nameLength: 3,
  });
  check("400 INVALID_INPUT nameLength", r3.status === 400 && r3.data.code === "INVALID_INPUT" && r3.data.field === "nameLength", `code=${r3.data.code} field=${r3.data.field}`);

  // 케이스 4: topN=100 (OUT_OF_RANGE, max=50)
  const r4 = await callApi({
    sungHanja: "林",
    sungStroke: 8,
    yongsin: ["수"],
    gisin: ["금"],
    nameLength: 2,
    topN: 100,
  });
  check("400 OUT_OF_RANGE topN", r4.status === 400 && r4.data.code === "OUT_OF_RANGE" && r4.data.field === "topN", `code=${r4.data.code} field=${r4.data.field}`);

  // 케이스 5 (선택): yongsin에 유효하지 않은 오행
  const r5 = await callApi({
    sungHanja: "林",
    sungStroke: 8,
    yongsin: ["불"],
    gisin: ["금"],
    nameLength: 2,
  });
  check("400 INVALID_INPUT yongsin", r5.status === 400 && r5.data.code === "INVALID_INPUT" && r5.data.field === "yongsin", `code=${r5.data.code} field=${r5.data.field}`);

  if (failures.length === 0) {
    console.log("✅ /api/recommend 입력 검증 5/5 통과");
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
