/**
 * Hub 즐겨찾기 도메인 타입 + pure helper.
 * Storage는 favorites-storage.ts (로그인 D1 / 게스트 localStorage).
 */

export const FAVORITES_SCHEMA_VERSION = 1 as const;

export type HubFavorites = {
  schemaVersion: typeof FAVORITES_SCHEMA_VERSION;
  slugs: string[]; // 순서: 최근 추가 먼저 (unshift)
  lastModified: number;
};

export function emptyFavorites(): HubFavorites {
  return {
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    slugs: [],
    lastModified: Date.now(),
  };
}

export function isFavorite(favs: HubFavorites | null, slug: string): boolean {
  return !!favs && favs.slugs.includes(slug);
}

export function toggleFavorite(
  favs: HubFavorites | null,
  slug: string,
): HubFavorites {
  const base = favs ?? emptyFavorites();
  const exists = base.slugs.includes(slug);
  const slugs = exists
    ? base.slugs.filter((s) => s !== slug)
    : [slug, ...base.slugs];
  return {
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    slugs,
    lastModified: Date.now(),
  };
}

/**
 * 즐겨찾기 순서 재배치. fromIndex의 슬러그를 빼서 toIndex 자리에 삽입.
 * 범위 외 인덱스 또는 fromIndex === toIndex 면 변경 없이 동일 객체.
 */
export function reorderFavorites(
  favs: HubFavorites | null,
  fromIndex: number,
  toIndex: number,
): HubFavorites {
  const base = favs ?? emptyFavorites();
  const n = base.slugs.length;
  if (
    fromIndex < 0 ||
    fromIndex >= n ||
    toIndex < 0 ||
    toIndex >= n ||
    fromIndex === toIndex
  ) {
    return base;
  }
  const slugs = [...base.slugs];
  const [moved] = slugs.splice(fromIndex, 1);
  slugs.splice(toIndex, 0, moved);
  return {
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    slugs,
    lastModified: Date.now(),
  };
}
