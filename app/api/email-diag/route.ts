import { getCloudflareContext } from "@opennextjs/cloudflare";
import { analyze, AI_FALLBACK } from "@/lib/ai/analyze";

type LookupResult = {
  found: boolean;
  value: unknown;
  raw: string;
  error?: string;
};

type DiagnosticResponse = {
  mx: LookupResult;
  spf: LookupResult;
  dmarc: LookupResult;
  ptr: LookupResult;
  analysis: string | null;
};

const AI_SYSTEM_PROMPT = `당신은 이메일 인프라 전문가입니다. 주어진 DNS 진단 결과(MX/SPF/DMARC/PTR)를 분석해 한국어로 간결히 설명해주세요. 형식: 첫 줄에 한 문장 종합 진단(예: '이 도메인은 발송 설정이 양호합니다'), 그 아래 '-'로 시작하는 bullet 2-4개로 발견된 문제점 또는 권장 조치. 기술 용어는 그대로 쓰되 일반인도 이해 가능하게.
응답은 반드시 한국어로 작성하세요. 영문은 기술 용어(SPF, DMARC, MX, PTR 등)만 허용.`;

function describeMx(result: LookupResult, records: MxRecord[]): string {
  if (result.error) return `조회 실패: ${result.error}`;
  if (records.length === 0) return "발견되지 않음";
  return records.map((r) => `- ${r.priority} ${r.host}`).join("\n");
}

function describeText(result: LookupResult): string {
  if (result.error) return `조회 실패: ${result.error}`;
  if (!result.found || result.value == null) return "발견되지 않음";
  return String(result.value);
}

function describePtr(result: LookupResult): string {
  if (result.error) return `조회 실패: ${result.error}`;
  const v = result.value as
    | { mxHost: string; ip: string | null; ptr: string | null }
    | null
    | undefined;
  if (!v) return "MX 레코드가 없어 PTR 조회 건너뜀";
  if (!v.ip) return `${v.mxHost} → IP를 찾지 못함`;
  if (!v.ptr) return `${v.mxHost} → ${v.ip} → PTR 없음`;
  const match = v.ptr === v.mxHost ? " (MX 호스트와 정합)" : " (MX 호스트와 불일치)";
  return `${v.mxHost} → ${v.ip} → ${v.ptr}${match}`;
}

function buildUserPrompt(
  domain: string,
  mx: LookupResult,
  mxRecords: MxRecord[],
  spf: LookupResult,
  dmarc: LookupResult,
  ptr: LookupResult,
): string {
  return [
    `도메인: ${domain}`,
    "",
    "[MX]",
    describeMx(mx, mxRecords),
    "",
    "[SPF]",
    describeText(spf),
    "",
    "[DMARC]",
    describeText(dmarc),
    "",
    "[PTR]",
    describePtr(ptr),
  ].join("\n");
}

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResponse = {
  Status: number;
  Answer?: DohAnswer[];
  Comment?: string[];
};

type MxRecord = { priority: number; host: string };

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

async function doh(name: string, type: string): Promise<DohResponse> {
  const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${type} ${name})`);
  }
  return (await res.json()) as DohResponse;
}

function unquoteTxt(data: string): string {
  const matches = data.match(/"([^"]*)"/g);
  if (!matches) return data;
  return matches.map((s) => s.slice(1, -1)).join("");
}

function stripDot(host: string): string {
  return host.replace(/\.$/, "");
}

function rawOf(query: { name: string; type: string }, response: unknown) {
  return JSON.stringify({ query, response }, null, 2);
}

async function lookupMx(
  domain: string,
): Promise<{ result: LookupResult; records: MxRecord[] }> {
  const query = { name: domain, type: "MX" };
  try {
    const res = await doh(domain, "MX");
    const records: MxRecord[] = (res.Answer ?? [])
      .filter((a) => a.type === 15)
      .map((a) => {
        const [pri, host] = a.data.split(/\s+/, 2);
        return { priority: Number(pri), host: stripDot(host ?? "") };
      })
      .sort((a, b) => a.priority - b.priority);
    return {
      result: {
        found: records.length > 0,
        value: records,
        raw: rawOf(query, res),
      },
      records,
    };
  } catch (e) {
    return {
      result: {
        found: false,
        value: null,
        raw: rawOf(query, null),
        error: `MX 조회 실패: ${(e as Error).message}`,
      },
      records: [],
    };
  }
}

async function lookupSpf(domain: string): Promise<LookupResult> {
  const query = { name: domain, type: "TXT" };
  try {
    const res = await doh(domain, "TXT");
    const txts = (res.Answer ?? [])
      .filter((a) => a.type === 16)
      .map((a) => unquoteTxt(a.data));
    const record = txts.find((t) => t.toLowerCase().startsWith("v=spf1"));
    return {
      found: !!record,
      value: record ?? null,
      raw: rawOf(query, res),
    };
  } catch (e) {
    return {
      found: false,
      value: null,
      raw: rawOf(query, null),
      error: `SPF 조회 실패: ${(e as Error).message}`,
    };
  }
}

async function lookupDmarc(domain: string): Promise<LookupResult> {
  const name = `_dmarc.${domain}`;
  const query = { name, type: "TXT" };
  try {
    const res = await doh(name, "TXT");
    const txts = (res.Answer ?? [])
      .filter((a) => a.type === 16)
      .map((a) => unquoteTxt(a.data));
    const record = txts.find((t) => t.toLowerCase().startsWith("v=dmarc1"));
    return {
      found: !!record,
      value: record ?? null,
      raw: rawOf(query, res),
    };
  } catch (e) {
    return {
      found: false,
      value: null,
      raw: rawOf(query, null),
      error: `DMARC 조회 실패: ${(e as Error).message}`,
    };
  }
}

async function lookupPtr(mxRecords: MxRecord[]): Promise<LookupResult> {
  const firstMx = mxRecords[0]?.host;
  if (!firstMx) {
    return {
      found: false,
      value: null,
      raw: "MX 레코드가 없어 PTR 조회를 건너뛰었습니다.",
    };
  }
  const aQuery = { name: firstMx, type: "A" };
  try {
    const aRes = await doh(firstMx, "A");
    const ips = (aRes.Answer ?? [])
      .filter((a) => a.type === 1)
      .map((a) => a.data);
    if (ips.length === 0) {
      return {
        found: false,
        value: { mxHost: firstMx, ip: null, ptr: null },
        raw: rawOf(aQuery, aRes),
      };
    }
    const ip = ips[0];
    const reverse = ip.split(".").reverse().join(".") + ".in-addr.arpa";
    const ptrQuery = { name: reverse, type: "PTR" };
    const ptrRes = await doh(reverse, "PTR");
    const ptrName = (ptrRes.Answer ?? [])
      .filter((a) => a.type === 12)
      .map((a) => stripDot(a.data))[0];
    return {
      found: !!ptrName,
      value: { mxHost: firstMx, ip, ptr: ptrName ?? null },
      raw: JSON.stringify(
        {
          a: { query: aQuery, response: aRes },
          ptr: { query: ptrQuery, response: ptrRes },
        },
        null,
        2,
      ),
    };
  } catch (e) {
    return {
      found: false,
      value: { mxHost: firstMx, ip: null, ptr: null },
      raw: rawOf(aQuery, null),
      error: `PTR 조회 실패: ${(e as Error).message}`,
    };
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "요청 본문이 올바른 JSON이 아닙니다." },
        { status: 400 },
      );
    }
    const rawInput = (body as { domain?: unknown })?.domain;
    if (typeof rawInput !== "string") {
      return Response.json(
        { error: "도메인을 입력해주세요." },
        { status: 400 },
      );
    }
    const domain = rawInput.trim().toLowerCase();
    if (!DOMAIN_RE.test(domain)) {
      return Response.json(
        { error: "유효한 도메인 형식이 아닙니다 (예: example.com)." },
        { status: 400 },
      );
    }

    const [mxOut, spf, dmarc] = await Promise.all([
      lookupMx(domain),
      lookupSpf(domain),
      lookupDmarc(domain),
    ]);
    const ptr = await lookupPtr(mxOut.records);

    let analysis: string | null = null;
    try {
      const { env } = getCloudflareContext();
      analysis = await analyze({
        env,
        system: AI_SYSTEM_PROMPT,
        user: buildUserPrompt(
          domain,
          mxOut.result,
          mxOut.records,
          spf,
          dmarc,
          ptr,
        ),
      });
      if (analysis === AI_FALLBACK) analysis = null;
    } catch (e) {
      console.error("[email-diag] AI analysis failed:", e);
      analysis = null;
    }

    const response: DiagnosticResponse = {
      mx: mxOut.result,
      spf,
      dmarc,
      ptr,
      analysis,
    };
    return Response.json(response);
  } catch (err) {
    const e = err as Error;
    return Response.json(
      {
        error: "핸들러에서 예기치 못한 오류",
        message: e?.message ?? String(err),
        stack: e?.stack ?? null,
      },
      { status: 500 },
    );
  }
}
