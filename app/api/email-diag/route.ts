import { getCloudflareContext } from "@opennextjs/cloudflare";
import { analyze, AI_FALLBACK } from "@/lib/ai/analyze";
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isLocale,
  type Locale,
} from "@/lib/i18n/types";
import { messages } from "@/lib/i18n/messages";

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

function buildSystemPrompt(locale: Locale): string {
  const lang = LOCALE_NAMES[locale];
  return `You are an email infrastructure expert. Analyze the given DNS diagnostic results (MX/SPF/DMARC/PTR) concisely.

Format: first line is a one-sentence overall verdict (e.g., "This domain has solid sending configuration"), then 2-4 bullets starting with '-' for issues found or recommended actions. Use technical terms naturally; explain so non-experts can follow.

Respond ONLY in ${lang}. Only technical acronyms (SPF, DMARC, MX, PTR, etc.) may appear in English.`;
}

function describeMx(result: LookupResult, records: MxRecord[]): string {
  if (result.error) return `lookup failed: ${result.error}`;
  if (records.length === 0) return "not found";
  return records.map((r) => `- ${r.priority} ${r.host}`).join("\n");
}

function describeText(result: LookupResult): string {
  if (result.error) return `lookup failed: ${result.error}`;
  if (!result.found || result.value == null) return "not found";
  return String(result.value);
}

function describePtr(result: LookupResult): string {
  if (result.error) return `lookup failed: ${result.error}`;
  const v = result.value as
    | { mxHost: string; ip: string | null; ptr: string | null }
    | null
    | undefined;
  if (!v) return "skipped (no MX records)";
  if (!v.ip) return `${v.mxHost} → no IP`;
  if (!v.ptr) return `${v.mxHost} → ${v.ip} → no PTR`;
  const match =
    v.ptr === v.mxHost ? " (matches MX host)" : " (does not match MX host)";
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
        error: `MX lookup failed: ${(e as Error).message}`,
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
      error: `SPF lookup failed: ${(e as Error).message}`,
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
      error: `DMARC lookup failed: ${(e as Error).message}`,
    };
  }
}

async function lookupPtr(mxRecords: MxRecord[]): Promise<LookupResult> {
  const firstMx = mxRecords[0]?.host;
  if (!firstMx) {
    return {
      found: false,
      value: null,
      raw: "Skipped: no MX records to derive PTR from.",
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
      error: `PTR lookup failed: ${(e as Error).message}`,
    };
  }
}

export async function POST(req: Request) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const t = messages[locale].emailDiag;
      return Response.json({ error: t.invalidJson }, { status: 400 });
    }

    const rawLocale = (body as { locale?: unknown })?.locale;
    if (isLocale(rawLocale)) locale = rawLocale;
    const t = messages[locale].emailDiag;

    const rawInput = (body as { domain?: unknown })?.domain;
    if (typeof rawInput !== "string") {
      return Response.json({ error: t.missingDomain }, { status: 400 });
    }
    const domain = rawInput.trim().toLowerCase();
    if (!DOMAIN_RE.test(domain)) {
      return Response.json({ error: t.invalidDomain }, { status: 400 });
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
        system: buildSystemPrompt(locale),
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
