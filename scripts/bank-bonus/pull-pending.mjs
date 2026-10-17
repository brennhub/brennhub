#!/usr/bin/env node
// Bank Bonus Tracker — pull the public Cowork export into data/bank-bonus/pending.json.
//
// Used by .github/workflows/bank-bonus-pending.yml (runs with the bb-data checkout as cwd).
// Node 20+, no dependencies. Exits non-zero when the export is unreachable, not HTTP 200,
// or not JSON with an `items` array, so the workflow never commits a broken file.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPORT_URL = process.env.BB_EXPORT_URL ?? "https://dev.brennhub.com/api/bank-bonus/export?all=1";
const OUT_PATH = resolve(process.cwd(), "data/bank-bonus/pending.json");
const TIMEOUT_MS = 60_000;

function fail(message) {
  console.error(`pull-pending: ${message}`);
  process.exit(1);
}

let res;
try {
  res = await fetch(EXPORT_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", "user-agent": "brennhub-bank-bonus-pending/1.0 (+GitHub Actions)" },
  });
} catch (err) {
  fail(`request failed: ${err instanceof Error ? err.message : String(err)}`);
}

if (res.status !== 200) fail(`unexpected HTTP ${res.status} from ${EXPORT_URL}`);

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  fail("response is not valid JSON");
}
if (!body || typeof body !== "object" || !Array.isArray(body.items)) fail("response JSON has no items array");

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, `${JSON.stringify(body, null, 2)}\n`, "utf8");
console.log(`pull-pending: wrote ${body.items.length} items to data/bank-bonus/pending.json`);
