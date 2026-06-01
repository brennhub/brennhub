/**
 * /api/hub/displays — Hub 카드 렌더용 데이터 (public).
 * 응답:
 *   {
 *     overrides: { [slug]: { ko?: {name?, description?}, en?: {name?, description?} } },
 *     settings:  { description_lines, padding_bottom }
 *   }
 * 클라이언트가 파일 default와 union하여 카드 표시.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

const DEFAULT_LINES = 3;
const DEFAULT_PB = 40;

type OverrideRow = {
  tool_slug: string;
  locale: string;
  name: string | null;
  description: string | null;
};

export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) {
    return Response.json({
      overrides: {},
      settings: { description_lines: DEFAULT_LINES, padding_bottom: DEFAULT_PB },
    });
  }
  try {
    const [overridesResult, settingsRow] = await Promise.all([
      db
        .prepare(
          "SELECT tool_slug, locale, name, description FROM tool_overrides",
        )
        .all<OverrideRow>(),
      db
        .prepare(
          "SELECT description_lines, padding_bottom FROM hub_card_settings WHERE id = 1",
        )
        .first<{ description_lines: number; padding_bottom: number }>(),
    ]);

    const overrides: Record<
      string,
      {
        ko?: { name?: string; description?: string };
        en?: { name?: string; description?: string };
      }
    > = {};
    for (const r of overridesResult.results ?? []) {
      if (r.locale !== "ko" && r.locale !== "en") continue;
      overrides[r.tool_slug] ??= {};
      const locBucket = (overrides[r.tool_slug][r.locale] ??= {});
      if (r.name) locBucket.name = r.name;
      if (r.description) locBucket.description = r.description;
    }

    return Response.json({
      overrides,
      settings: settingsRow ?? {
        description_lines: DEFAULT_LINES,
        padding_bottom: DEFAULT_PB,
      },
    });
  } catch (e) {
    console.error("[hub/displays GET] DB error:", e);
    return Response.json({
      overrides: {},
      settings: { description_lines: DEFAULT_LINES, padding_bottom: DEFAULT_PB },
    });
  }
}
