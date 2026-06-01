/**
 * Hub displays client helper.
 * /api/hub/displays fetch + 파일 default와 union 적용.
 */

export type LocaleOverride = { name?: string; description?: string };
export type OverridesMap = Record<
  string,
  { ko?: LocaleOverride; en?: LocaleOverride }
>;
export type CardSettings = {
  description_lines: number;
  padding_bottom: number;
};

export type DisplaysResult = {
  overrides: OverridesMap;
  settings: CardSettings;
};

const DEFAULT_SETTINGS: CardSettings = {
  description_lines: 3,
  padding_bottom: 40,
};

export async function fetchDisplays(): Promise<DisplaysResult> {
  try {
    const res = await fetch("/api/hub/displays", {
      method: "GET",
      credentials: "same-origin",
    });
    if (!res.ok) {
      return { overrides: {}, settings: DEFAULT_SETTINGS };
    }
    return (await res.json()) as DisplaysResult;
  } catch {
    return { overrides: {}, settings: DEFAULT_SETTINGS };
  }
}

/**
 * 파일 default와 override 머지. override의 빈 필드는 default 사용.
 */
export function resolveDisplay(
  fileDefault: { name: string; description: string },
  override: LocaleOverride | undefined,
): { name: string; description: string } {
  return {
    name: override?.name?.trim() || fileDefault.name,
    description: override?.description?.trim() || fileDefault.description,
  };
}
