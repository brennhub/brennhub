# brennhub

Indie tools by brenn — small, sharp, opinionated. A single Next.js app that hosts a growing collection of tools under one roof.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS v4
- shadcn/ui
- Anthropic SDK (`@anthropic-ai/sdk`)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Visit `http://localhost:3000`.

## Development

여러 머신(개인/회사 랩탑 등)을 오가며 작업하는 환경을 가정합니다.

- **Line endings**: `.gitattributes`로 LF 통일. Windows 전용 스크립트(`.cmd`, `.bat`, `.ps1`)만 CRLF 유지.
- **프로젝트 위치**: OneDrive 동기화 폴더(`Documents`, `Desktop` 등) 안에는 두지 마세요. `node_modules`가 sync 큐를 막고, 경로가 길어지면 일부 Node 도구가 깨지고, 두 머신이 같은 파일을 동시에 건드리면 충돌이 납니다.
- **권장 레이아웃**: `C:\dev\<repo>` 같은 단일 dev 루트 사용. 머신 간 동기화는 git remote로만.

## Factory mode

`brennhub` is built as a factory: a hub page lists every tool, each tool lives at `/tools/<slug>`, and the whole catalog is driven by a single registry. Add a tool by editing one file and creating one page — no routing config, no menu plumbing.

### Adding a new tool

The `[slug]` route only prerenders entries whose `status === "coming-soon"`. A `"live"` tool must have its own page at `app/tools/<slug>/page.tsx` — registry and route are two independent halves, and shipping a tool means flipping **both**.

**New placeholder (announce only):**

- [ ] Add entry to [lib/tools-registry.ts](lib/tools-registry.ts) with `status: "coming-soon"`.
- [ ] Done. `/tools/<slug>` now serves the generic "Coming soon" placeholder.

**Ship live (or convert a placeholder):**

- [ ] Create `app/tools/<slug>/page.tsx` (the real UI).
- [ ] Set `status: "live"` in the registry.
- [ ] Run `npm run build` and confirm the build output lists `/tools/<slug>` as its own row, **not** as a sub-entry under `/tools/[slug]`.

Skipping either step breaks routing:

| State                                     | Result                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Page exists, status still `"coming-soon"` | Build-time collision: `[slug]` and the static page both emit `/tools/<slug>` → 404 in prod. |
| Status `"live"`, no page                  | Hub links to a non-existent route → 404.                                                |

**Registry entry shape:**

```ts
{
  id: "snip",
  name: "Snip",
  description: "Turn long things into short things.",
  slug: "snip",
  status: "coming-soon",       // or "live"
  createdAt: "2026-05-12",
}
```

### UI principle: don't show "AI" to the user

Never expose the word "AI" in tool UI — labels, headings, descriptions, or
button text. AI is an implementation detail, not a user-facing value.

Name the surface after what it produces, in whatever language fits the tool:
- `종합 분석` (email-diag)
- `결과 요약`
- `Summary`, `Explanation`, `Verdict`

Same goes for footer copy and tooltips — describe the output ("자연어 요약",
"plain-language explanation"), not the mechanism.

## Adding a new language

i18n lives in [lib/i18n/](lib/i18n). Adding a new language touches **exactly
three places**; everything else is type-driven so TypeScript will flag any
location you forget.

1. **[lib/i18n/types.ts](lib/i18n/types.ts)** — append the locale code to the
   `LOCALES` array. `Locale` is derived from this array, so the union widens
   automatically.

2. **[lib/i18n/types.ts](lib/i18n/types.ts)** (same file) — add the locale's
   own-script display name to `LOCALE_NAMES`. This drives the toggle button
   label *and* the AI prompt directive ("Respond ONLY in ${LOCALE_NAMES[locale]}").

3. **[lib/i18n/messages.ts](lib/i18n/messages.ts)** — add a complete entry
   for the new locale to the `messages` record. The `Messages` type forces
   you to fill in every field, including each tool's `name` / `description`.

That's it. The toggle picks up the new option (`LOCALES.map`), every page
already routes display strings through `useMessages()`, and the email-diag
prompt re-points to the new language without code changes.

### Example: adding Japanese

```ts
// lib/i18n/types.ts
export const LOCALES = ["ko", "en", "ja"] as const;   // (1)

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",                                          // (2)
};
```

```ts
// lib/i18n/messages.ts
export const messages: Record<Locale, Messages> = {
  ko: { /* ... */ },
  en: { /* ... */ },
  ja: {                                                  // (3)
    hub: { title: "brennhub", subtitle: "...", empty: "..." },
    toolCommon: { /* ... */ },
    emailDiag: { /* ... */ },
    tools: { "email-diag": { name: "...", description: "..." } },
  },
};
```

The toggle now shows three buttons. The AI prompt now requests Japanese
output. No other file needs to change.

### v1 candidate: no-flash SSR

The current provider hydrates client-side, so a first-time English visitor
sees one paint in Korean before the toggle resolves. A middleware + cookie
strategy (read `Accept-Language` on first request, write a cookie, read it
in server components) would eliminate that flash. Deferred — single paint
of Korean is acceptable while the audience is small.

## Project layout

```
app/
  page.tsx              # hub landing — renders registry as a card grid
  tools/[slug]/page.tsx # dynamic placeholder for unbuilt tools
lib/
  tools-registry.ts     # central tool metadata
  utils.ts              # shadcn cn() helper
components/ui/          # shadcn components
```

## Environment

Secrets live in `.env.local` (gitignored). See `.env.example` for required keys.

See [BACKLOG.md](./BACKLOG.md) for deferred ideas.
