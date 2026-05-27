import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  CompatibilityRule,
  Supplement,
} from "@/lib/supp-plan/types";
import { SuppPlanClientShell } from "./client-shell";
import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("supp-plan");

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

export const dynamic = "force-dynamic";

export default async function SuppPlanPage() {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { SUPP_DB?: D1Database }).SUPP_DB;

  let supplements: Supplement[] = [];
  let rules: CompatibilityRule[] = [];
  let dbError: string | null = null;

  if (!db) {
    dbError = "SUPP_DB binding 'SUPP_DB'를 찾을 수 없습니다.";
  } else {
    try {
      const [suppsRes, rulesRes] = await Promise.all([
        db
          .prepare(
            "SELECT id, name_kr, name_en, category, solubility, metabolism, excretion, daily_recommended, recommended_state, effects, notes FROM supplements ORDER BY category, name_kr",
          )
          .all<SupplementRow>(),
        db
          .prepare(
            "SELECT id, supplement_a, supplement_b, rule_type, notes, source FROM compatibility_rules",
          )
          .all<CompatibilityRule>(),
      ]);

      supplements = (suppsRes.results ?? []).map((r) => ({
        id: r.id,
        name_kr: r.name_kr,
        name_en: r.name_en,
        category: r.category as Supplement["category"],
        solubility: r.solubility as Supplement["solubility"],
        metabolism: parseJsonArray(r.metabolism) as Supplement["metabolism"],
        excretion: parseJsonArray(r.excretion) as Supplement["excretion"],
        daily_recommended: r.daily_recommended,
        recommended_state:
          r.recommended_state as Supplement["recommended_state"],
        effects: r.effects,
        notes: r.notes,
      }));
      rules = rulesRes.results ?? [];
    } catch (e) {
      dbError = (e as Error).message;
    }
  }

  return (
    <SuppPlanClientShell
      supplements={supplements}
      rules={rules}
      dbError={dbError}
    />
  );
}
