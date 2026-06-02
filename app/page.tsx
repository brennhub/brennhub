"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { tools, type Tool } from "@/lib/tools-registry";
import { CATEGORY_ORDER, groupByCategory } from "@/lib/hub/categories";
import {
  emptyFavorites,
  isFavorite,
  toggleFavorite,
  type HubFavorites,
} from "@/lib/hub/favorites";
import {
  getFavoritesStorage,
  loadFavoritesForUser,
} from "@/lib/hub/favorites-storage";
import {
  fetchDisplays,
  resolveDisplay,
  type OverridesMap,
} from "@/lib/hub/displays";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import {
  FeedbackDialog,
  type FeedbackTool,
} from "@/components/feedback-dialog";
import { ToolCard } from "@/components/hub/tool-card";
import { HubSearchInput } from "@/components/hub/search-input";

export default function Home() {
  const t = useMessages();
  const { locale } = useLocale();
  const user = useCurrentUser();
  const isLoggedIn = !!user;

  const [feedbackTool, setFeedbackTool] = useState<FeedbackTool | undefined>(
    undefined,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<HubFavorites>(emptyFavorites());
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState<OverridesMap>({});

  // Hub displays (도구 override) — mount 1회 fetch.
  useEffect(() => {
    let cancelled = false;
    fetchDisplays().then(({ overrides: o }) => {
      if (cancelled) return;
      setOverrides(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 도구 → display(locale 적용 + override 머지) resolver.
  const displayFor = useCallback(
    (slug: string) => {
      const fileDefault = t.tools[slug] ?? { name: slug, description: "" };
      const override = overrides[slug]?.[locale];
      return resolveDisplay(fileDefault, override);
    },
    [t.tools, overrides, locale],
  );

  const storage = useMemo(
    () => getFavoritesStorage(isLoggedIn),
    [isLoggedIn],
  );

  // mount + 로그인 상태 변화 시 storage에서 favorites 재로드.
  // 비로그인은 즐겨찾기 미사용 정책 (UI에서 toast로 차단). 빈 상태 강제.
  useEffect(() => {
    if (!isLoggedIn) {
      setFavorites(emptyFavorites());
      return;
    }
    let cancelled = false;
    loadFavoritesForUser(isLoggedIn).then((favs) => {
      if (!cancelled) setFavorites(favs);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleToggleFavorite = useCallback(
    async (slug: string) => {
      const next = toggleFavorite(favorites, slug);
      setFavorites(next);
      await storage.save(next);
    },
    [favorites, storage],
  );

  const openFeedback = (slug: FeedbackTool) => {
    setFeedbackTool(slug);
    setDialogOpen(true);
  };

  // 검색 — override 적용된 표시 텍스트 + slug 대상, case-insensitive.
  const q = query.trim().toLowerCase();
  const matchesQuery = (tool: Tool): boolean => {
    if (!q) return true;
    const d = displayFor(tool.slug);
    const hay = `${d.name} ${d.description} ${tool.slug}`.toLowerCase();
    return hay.includes(q);
  };

  const filteredTools = tools.filter(matchesQuery);
  const filteredGroups = groupByCategory(filteredTools);
  const sections = CATEGORY_ORDER.filter(
    (cat) => (filteredGroups.get(cat) ?? []).length > 0,
  );

  // 즐겨찾기 = favorites.slugs 순서 유지 + 검색 결과에 포함된 것만.
  const favoriteTools: Tool[] = favorites.slugs
    .map((slug) => filteredTools.find((tool) => tool.slug === slug))
    .filter((tool): tool is Tool => !!tool);

  const showEmpty = tools.length > 0 && filteredTools.length === 0;
  const showChips = !q && (favoriteTools.length > 0 || sections.length > 0);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToAnchor =
    (anchor: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-20">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          {t.hub.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {t.hub.subtitle}
        </p>
      </header>

      {tools.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">{t.hub.empty}</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <HubSearchInput value={query} onChange={setQuery} />
          </div>

          {showChips && (
            <nav
              aria-label="categories"
              className="mb-10 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
            >
              <a
                href="#top"
                onClick={scrollToTop}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {t.hub.allCategory}
              </a>
              {favoriteTools.length > 0 && (
                <a
                  href="#favorites"
                  onClick={scrollToAnchor("favorites")}
                  className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  <Star
                    aria-hidden
                    className="size-3.5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                  />
                  {t.hub.favoritesHeading}
                </a>
              )}
              {sections.map((cat) => (
                <a
                  key={cat}
                  href={`#category-${cat}`}
                  onClick={scrollToAnchor(`category-${cat}`)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {t.hub.categories[cat]}
                </a>
              ))}
            </nav>
          )}

          {showEmpty ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400">
                {t.hub.searchEmpty}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {favoriteTools.length > 0 && (
                <section
                  id="favorites"
                  aria-labelledby="heading-favorites"
                  className="scroll-mt-6"
                >
                  <h2
                    id="heading-favorites"
                    className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                  >
                    <Star
                      aria-hidden
                      className="size-3.5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                    />
                    {t.hub.favoritesHeading}
                  </h2>
                  <ul className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {favoriteTools.map((tool) => (
                      <li key={tool.id} className="h-full">
                        <ToolCard
                          tool={tool}
                          isFavorite={true}
                          display={displayFor(tool.slug)}
                          onToggleFavorite={handleToggleFavorite}
                          onOpenFeedback={openFeedback}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {sections.map((cat) => {
                const list = filteredGroups.get(cat) ?? [];
                return (
                  <section
                    key={cat}
                    id={`category-${cat}`}
                    aria-labelledby={`heading-${cat}`}
                    className="scroll-mt-6"
                  >
                    <h2
                      id={`heading-${cat}`}
                      className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                    >
                      {t.hub.categories[cat]}
                    </h2>
                    <ul className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((tool) => (
                        <li key={tool.id} className="h-full">
                          <ToolCard
                            tool={tool}
                            isFavorite={isFavorite(favorites, tool.slug)}
                            display={displayFor(tool.slug)}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenFeedback={openFeedback}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTool={feedbackTool}
      />
    </main>
  );
}
