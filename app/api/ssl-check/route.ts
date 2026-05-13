import { getCloudflareContext } from "@opennextjs/cloudflare";
import { analyze, AI_FALLBACK } from "@/lib/ai/analyze";
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isLocale,
  type Locale,
} from "@/lib/i18n/types";
import { messages } from "@/lib/i18n/messages";

type Certificate = {
  commonName: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  daysRemaining: number;
  subjectAltNames: string[];
};

type CheckResponse = {
  certificate: Certificate | null;
  raw: unknown;
  analysis: string | null;
  error?: string;
};

type CrtShEntry = {
  issuer_name?: string;
  common_name?: string;
  name_value?: string;
  not_before?: string;
  not_after?: string;
};

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const buildSystemPrompt = (locale: Locale) =>
  `You are an SSL/TLS certificate analyst. Given certificate metadata, provide a concise diagnostic.

Format:
- First line: one-sentence verdict (e.g., 'Certificate is healthy with N days remaining' or 'Expiry urgent — renew within X days')
- Following 2-3 bullets starting with '-':
  * Expiry urgency (when to renew)
  * Issuer trust (well-known CA vs unusual)
  * SAN coverage (apex only? wildcard? www included?)
  * Any specific concerns

Be concise (under 150 words). Respond ONLY in ${LOCALE_NAMES[locale]}.
Technical acronyms (SSL, TLS, SAN, CA, Let's Encrypt, CN) stay in English.`;

function parseUtc(raw: string): number {
  // crt.sh returns ISO without TZ designator. Treat as UTC.
  const hasTz = /[Zz]|[+-]\d{2}:?\d{2}$/.test(raw);
  return Date.parse(hasTz ? raw : `${raw}Z`);
}

function toIsoUtc(raw: string): string {
  return new Date(parseUtc(raw)).toISOString();
}

function buildUserPrompt(domain: string, cert: Certificate): string {
  return [
    `Domain: ${domain}`,
    `Common Name: ${cert.commonName}`,
    `Issuer: ${cert.issuer}`,
    `Issued: ${cert.notBefore}`,
    `Expires: ${cert.notAfter} (${cert.daysRemaining} days remaining)`,
    `SAN: ${cert.subjectAltNames.join(", ")}`,
  ].join("\n");
}

export async function POST(req: Request) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const t = messages[locale].sslCheck;
      return Response.json({ error: t.invalidJson }, { status: 400 });
    }

    const rawLocale = (body as { locale?: unknown })?.locale;
    if (isLocale(rawLocale)) locale = rawLocale;
    const t = messages[locale].sslCheck;

    const rawDomain = (body as { domain?: unknown })?.domain;
    if (typeof rawDomain !== "string") {
      return Response.json({ error: t.missingDomain }, { status: 400 });
    }
    const domain = rawDomain.trim().toLowerCase();
    if (!DOMAIN_RE.test(domain)) {
      return Response.json({ error: t.invalidDomain }, { status: 400 });
    }

    const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&exclude=expired&output=json`;
    let entries: CrtShEntry[] = [];
    let rawText: string | null = null;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "brennhub-ssl-check/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const failed: CheckResponse = {
          certificate: null,
          raw: { status: res.status },
          analysis: null,
          error: t.fetchFailed,
        };
        return Response.json(failed);
      }
      rawText = await res.text();
      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) entries = parsed as CrtShEntry[];
      } catch {
        const failed: CheckResponse = {
          certificate: null,
          raw: { snippet: rawText.slice(0, 200) },
          analysis: null,
          error: t.fetchFailed,
        };
        return Response.json(failed);
      }
    } catch (e) {
      console.error("[ssl-check] crt.sh fetch failed:", e);
      const failed: CheckResponse = {
        certificate: null,
        raw: null,
        analysis: null,
        error: t.fetchFailed,
      };
      return Response.json(failed);
    }

    if (entries.length === 0) {
      const empty: CheckResponse = {
        certificate: null,
        raw: [],
        analysis: null,
        error: t.noCertificate,
      };
      return Response.json(empty);
    }

    const sorted = [...entries].sort(
      (a, b) => parseUtc(b.not_before ?? "") - parseUtc(a.not_before ?? ""),
    );
    const latest = sorted[0];
    if (!latest.not_before || !latest.not_after) {
      const failed: CheckResponse = {
        certificate: null,
        raw: latest,
        analysis: null,
        error: t.fetchFailed,
      };
      return Response.json(failed);
    }

    const sans = Array.from(
      new Set(
        (latest.name_value ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ).sort();

    const notAfterMs = parseUtc(latest.not_after);
    const daysRemaining = Math.floor((notAfterMs - Date.now()) / 86_400_000);

    const certificate: Certificate = {
      commonName: latest.common_name ?? "",
      issuer: latest.issuer_name ?? "",
      notBefore: toIsoUtc(latest.not_before),
      notAfter: toIsoUtc(latest.not_after),
      daysRemaining,
      subjectAltNames: sans,
    };

    let analysis: string | null = null;
    try {
      const { env } = getCloudflareContext();
      const result = await analyze({
        env,
        system: buildSystemPrompt(locale),
        user: buildUserPrompt(domain, certificate),
      });
      analysis = result === AI_FALLBACK ? null : result.trim() || null;
    } catch (e) {
      console.error("[ssl-check] AI analysis failed:", e);
      analysis = null;
    }

    const response: CheckResponse = {
      certificate,
      raw: latest,
      analysis,
    };
    return Response.json(response);
  } catch (err) {
    const e = err as Error;
    return Response.json(
      {
        error: "Unexpected handler error",
        message: e?.message ?? String(err),
        stack: e?.stack ?? null,
      },
      { status: 500 },
    );
  }
}
