export const runtime = "edge";

type LookupResult = {
  found: boolean;
  value: unknown;
  raw: string;
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

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

async function doh(name: string, type: string): Promise<DohResponse> {
  const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!res.ok) {
    throw new Error(`DoH 요청 실패 (${type} ${name}): HTTP ${res.status}`);
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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 },
    );
  }
  const raw = (body as { domain?: unknown })?.domain;
  if (typeof raw !== "string") {
    return Response.json(
      { error: "도메인을 입력해주세요." },
      { status: 400 },
    );
  }
  const domain = raw.trim().toLowerCase();
  if (!DOMAIN_RE.test(domain)) {
    return Response.json(
      { error: "유효한 도메인 형식이 아닙니다 (예: example.com)." },
      { status: 400 },
    );
  }

  try {
    const mxRes = await doh(domain, "MX");
    const mxRecords = (mxRes.Answer ?? [])
      .filter((a) => a.type === 15)
      .map((a) => {
        const [pri, host] = a.data.split(/\s+/, 2);
        return { priority: Number(pri), host: stripDot(host ?? "") };
      })
      .sort((a, b) => a.priority - b.priority);
    const mx: LookupResult = {
      found: mxRecords.length > 0,
      value: mxRecords,
      raw: JSON.stringify(mxRes, null, 2),
    };

    const spfRes = await doh(domain, "TXT");
    const spfTxts = (spfRes.Answer ?? [])
      .filter((a) => a.type === 16)
      .map((a) => unquoteTxt(a.data));
    const spfRecord = spfTxts.find((t) =>
      t.toLowerCase().startsWith("v=spf1"),
    );
    const spf: LookupResult = {
      found: !!spfRecord,
      value: spfRecord ?? null,
      raw: JSON.stringify(spfRes, null, 2),
    };

    const dmarcRes = await doh(`_dmarc.${domain}`, "TXT");
    const dmarcTxts = (dmarcRes.Answer ?? [])
      .filter((a) => a.type === 16)
      .map((a) => unquoteTxt(a.data));
    const dmarcRecord = dmarcTxts.find((t) =>
      t.toLowerCase().startsWith("v=dmarc1"),
    );
    const dmarc: LookupResult = {
      found: !!dmarcRecord,
      value: dmarcRecord ?? null,
      raw: JSON.stringify(dmarcRes, null, 2),
    };

    let ptr: LookupResult = {
      found: false,
      value: null,
      raw: "MX 레코드가 없어 PTR 조회를 건너뛰었습니다.",
    };
    const firstMx = mxRecords[0]?.host;
    if (firstMx) {
      try {
        const aRes = await doh(firstMx, "A");
        const ips = (aRes.Answer ?? [])
          .filter((a) => a.type === 1)
          .map((a) => a.data);
        if (ips.length === 0) {
          ptr = {
            found: false,
            value: { mxHost: firstMx, ip: null, ptr: null },
            raw: JSON.stringify(aRes, null, 2),
          };
        } else {
          const ip = ips[0];
          const reverse = ip.split(".").reverse().join(".") + ".in-addr.arpa";
          const ptrRes = await doh(reverse, "PTR");
          const ptrName = (ptrRes.Answer ?? [])
            .filter((a) => a.type === 12)
            .map((a) => stripDot(a.data))[0];
          ptr = {
            found: !!ptrName,
            value: { mxHost: firstMx, ip, ptr: ptrName ?? null },
            raw: JSON.stringify({ a: aRes, ptr: ptrRes }, null, 2),
          };
        }
      } catch (e) {
        ptr = {
          found: false,
          value: null,
          raw: `PTR 조회 실패: ${(e as Error).message}`,
        };
      }
    }

    const response: DiagnosticResponse = { mx, spf, dmarc, ptr };
    return Response.json(response);
  } catch (err) {
    return Response.json(
      { error: `진단 중 오류가 발생했습니다: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
