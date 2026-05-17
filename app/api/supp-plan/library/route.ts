import { getCloudflareContext } from "@opennextjs/cloudflare";

type SupplementRow = {
  id: string;
  name_kr: string;
  name_en: string | null;
  category: string;
  solubility: string | null;
  metabolism: string | null;
  excretion: string | null;
  daily_recommended: string | null;
  recommended_state: string | null;
  effects: string | null;
  notes: string | null;
};

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const { env } = getCloudflareContext();
  const db = (env as { SUPP_DB?: D1Database }).SUPP_DB;
  if (!db) {
    return Response.json(
      { error: "SUPP_DB binding unavailable", supplements: [], rules: [] },
      { status: 500 },
    );
  }

  try {
    const [suppsResult, rulesResult] = await Promise.all([
      db
        .prepare(
          "SELECT id, name_kr, name_en, category, solubility, metabolism, excretion, daily_recommended, recommended_state, effects, notes FROM supplements ORDER BY category, name_kr",
        )
        .all<SupplementRow>(),
      db
        .prepare(
          "SELECT id, supplement_a, supplement_b, rule_type, notes, source FROM compatibility_rules",
        )
        .all(),
    ]);

    const supplements = (suppsResult.results ?? []).map((r) => ({
      id: r.id,
      name_kr: r.name_kr,
      name_en: r.name_en,
      category: r.category,
      solubility: r.solubility,
      metabolism: parseJsonArray(r.metabolism),
      excretion: parseJsonArray(r.excretion),
      daily_recommended: r.daily_recommended,
      recommended_state: r.recommended_state,
      effects: r.effects,
      notes: r.notes,
    }));

    return Response.json({
      supplements,
      rules: rulesResult.results ?? [],
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message, supplements: [], rules: [] },
      { status: 500 },
    );
  }
}
