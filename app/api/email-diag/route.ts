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
};

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

    const response: DiagnosticResponse = {
      mx: mxOut.result,
      spf,
      dmarc,
      ptr,
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
