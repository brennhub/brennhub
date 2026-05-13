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

1. **Register it.** Add a single entry to [lib/tools-registry.ts](lib/tools-registry.ts):

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

   The hub page picks it up automatically.

2. **Build it.** Replace the dynamic placeholder by creating a dedicated route at `app/tools/<slug>/page.tsx`. The dynamic `[slug]` route renders a "Coming soon" placeholder until a real page exists at the same slug — Next.js prefers static routes over dynamic ones, so just dropping in `app/tools/snip/page.tsx` takes over.

3. **Flip the status.** Change `status` to `"live"` in the registry when shipping.

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
