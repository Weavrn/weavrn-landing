# CLAUDE.md

## Project

Weavrn landing page and social mining dashboard. Next.js 14 (App Router) + Tailwind CSS + Supabase.

## Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS with custom `weavrn-*` color tokens
- **Database:** Supabase (profiles + submissions tables)
- **APIs:** X/Twitter API Basic for tweet metric fetching
- **Wallet:** MetaMask direct integration + manual address entry
- **Deploy:** Vercel

## Structure

```
src/
  app/
    page.tsx              # Marketing landing page
    layout.tsx            # Root layout, fonts, metadata
    globals.css           # Tailwind + custom glow/grid effects
    mine/page.tsx         # Social mining dashboard
    api/
      submit/route.ts     # Post submission endpoint
      rewards/route.ts    # Reward/submission query endpoint
      auth/link/route.ts  # Wallet <-> X handle linking
  components/             # Landing page sections + mining UI
  lib/
    constants.ts          # Social links, token allocations, roadmap data
    supabase.ts           # Lazy-init Supabase client + types
    twitter.ts            # X API fetching + engagement score calculation
```

## Design System

- Dark mode: `#0A0A0F` background, `#00D4AA` accent (teal-cyan)
- Gradient text: teal-to-blue (`#00D4AA` -> `#00A3FF`)
- Cards use `.glow-card` class (gradient border, hover lift + glow)
- Section headers: mono uppercase accent label + bold heading
- Generous `py-32` section spacing

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
X_BEARER_TOKEN=
```

## Commands

- `npm run dev` — local development
- `npm run build` — production build
- `supabase-schema.sql` — run in Supabase SQL editor to set up tables

## Related Repos

- [Weavrn](https://github.com/Weavrn/Weavrn) — planning repo, smart contracts, docs
