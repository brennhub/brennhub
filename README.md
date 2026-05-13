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
