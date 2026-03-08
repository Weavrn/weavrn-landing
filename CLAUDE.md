# CLAUDE.md

## Project

Weavrn landing page, social mining dashboard, and admin panel. Next.js 14 (App Router) + Tailwind CSS. Static export (no server-side routes). All API calls go to weavrn-api (Fastify backend on Digital Ocean).

## Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS with custom `weavrn-*` color tokens
- **Wallet:** MetaMask via ethers.js v6 (BrowserProvider + JsonRpcSigner)
- **Chain:** Base Sepolia (testnet) / Base (mainnet)
- **API:** weavrn-api (Fastify + Postgres, separate repo)
- **Deploy:** Vercel (static export)

## Structure

```
src/
  app/
    page.tsx              # Marketing landing page
    layout.tsx            # Root layout, fonts, metadata
    globals.css           # Tailwind + custom glow/grid effects
    mine/page.tsx         # Social mining dashboard (wallet connect + claim flow)
    admin/page.tsx        # Admin submission review + approve/reject
  components/
    Hero.tsx, WhyWeavrn.tsx, Mining.tsx, Tokenomics.tsx, Roadmap.tsx, Footer.tsx
    Navbar.tsx, RewardsCalculator.tsx
    WalletConnect.tsx     # MetaMask connect + chain switching + signer
    MiningDashboard.tsx   # Submit posts, view submissions, claim rewards
  lib/
    api.ts                # HTTP client for weavrn-api endpoints
    contracts.ts          # ethers contract interaction (claimReward, chain switch, add token)
    constants.ts          # Social links, token allocations, roadmap phases
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
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCIAL_MINING_ADDRESS=
NEXT_PUBLIC_WVRN_TOKEN_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=
```

## Commands

- `npm run dev` — local development
- `npm run build` — production build (static export to `out/`)

## Related Repos

- [weavrn-api](https://github.com/Weavrn/weavrn-api) — Fastify API backend
- [weavrn-contracts](https://github.com/Weavrn/weavrn-contracts) — Solidity contracts (Foundry)
- [Weavrn](https://github.com/cfausn/Weavrn) — planning repo, docs
