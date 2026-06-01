/**
 * Hub 즐겨찾기 storage 분기.
 * 로그인 = D1 (generic D1UserData) / 게스트 = localStorage.
 * 자동 이전 없음 — Phase 2-2 supp-plan 결정 일관 적용.
 */

import { D1UserData } from "@/lib/user-data/d1";
import {
  FAVORITES_SCHEMA_VERSION,
  emptyFavorites,
  type HubFavorites,
} from "./favorites";

const TOOL_SLUG = "hub-favorites";
const KEY = "brennhub-hub-favorites";

export interface FavoritesStorage {
  get(): Promise<HubFavorites | null>;
  save(favs: HubFavorites): Promise<void>;
}

class LocalStorageFavorites implements FavoritesStorage {
  async get(): Promise<HubFavorites | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<HubFavorites>;
      if (
        parsed.schemaVersion === FAVORITES_SCHEMA_VERSION &&
        Array.isArray(parsed.slugs)
      ) {
        return parsed as HubFavorites;
      }
      return null;
    } catch {
      return null;
    }
  }

  async save(favs: HubFavorites): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(favs));
    } catch {
      // quota or unavailable — selection still applies for session
    }
  }
}

class D1Favorites implements FavoritesStorage {
  private readonly backend = new D1UserData<HubFavorites>(TOOL_SLUG);

  async get(): Promise<HubFavorites | null> {
    return this.backend.get();
  }

  async save(favs: HubFavorites): Promise<void> {
    await this.backend.save(favs);
  }
}

export function getFavoritesStorage(isLoggedIn: boolean): FavoritesStorage {
  return isLoggedIn ? new D1Favorites() : new LocalStorageFavorites();
}

export async function loadFavoritesForUser(
  isLoggedIn: boolean,
): Promise<HubFavorites> {
  const storage = getFavoritesStorage(isLoggedIn);
  const data = await storage.get();
  return data ?? emptyFavorites();
}
