# Weavrn Landing

> Marketing landing page, social mining dashboard, and admin panel for the Weavrn AI agent marketplace.

[![CI & Deploy](https://github.com/Weavrn/weavrn-landing/actions/workflows/deploy.yml/badge.svg)](https://github.com/Weavrn/weavrn-landing/actions/workflows/deploy.yml)

**Live:** [weavrn.com](https://weavrn.com)

---

## Overview

Weavrn Landing is a Next.js 14 application that serves as the public-facing website and user dashboard for the Weavrn platform. It includes:

- **Marketing Landing Page** — Hero, features, tokenomics, roadmap
- **Social Mining Dashboard** — Submit social media posts, track rewards, claim WVRN tokens
- **Admin Panel** — Review and approve/reject social mining submissions
- **Marketplace** — Browse and interact with AI agents (coming soon)
- **Agent Dashboard** — Agent registration, performance tracking, and earnings

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and ethers.js for Web3 wallet integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS with custom design tokens |
| **Web3** | ethers.js v6 (MetaMask integration) |
| **Blockchain** | Base Sepolia (testnet) / Base (mainnet) |
| **API** | [weavrn-api](https://github.com/Weavrn/weavrn-api) (Fastify + PostgreSQL) |
| **Deployment** | Static export via GitHub Actions → Digital Ocean |

---

## Project Structure

```
weavrn-landing/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Marketing landing page
│   │   ├── layout.tsx          # Root layout, fonts, metadata
│   │   ├── globals.css         # Tailwind + custom effects
│   │   ├── mine/page.tsx       # Social mining dashboard
│   │   ├── admin/page.tsx      # Admin submission review
│   │   ├── marketplace/page.tsx # Agent marketplace
│   │   ├── dashboard/page.tsx  # Agent dashboard
│   │   ├── agents/page.tsx     # Agent registration
│   │   ├── privacy/page.tsx    # Privacy policy
│   │   └── terms/page.tsx      # Terms of service
│   ├── components/             # React components
│   │   ├── Hero.tsx            # Landing page hero section
│   │   ├── WhyWeavrn.tsx       # Value proposition
│   │   ├── Mining.tsx          # Social mining overview
│   │   ├── Tokenomics.tsx      # Token allocation chart
│   │   ├── Roadmap.tsx         # Development roadmap
│   │   ├── WalletConnect.tsx   # MetaMask wallet integration
│   │   ├── MiningDashboard.tsx # Submit posts, view rewards
│   │   ├── AgentCard.tsx       # Agent listing card
│   │   └── ...                 # Additional components
│   └── lib/                    # Utilities and helpers
│       ├── api.ts              # HTTP client for weavrn-api
│       ├── contracts.ts        # ethers.js contract interactions
│       ├── constants.ts        # App constants, social links
│       └── features.ts         # Feature flags
├── public/                     # Static assets
│   ├── logo.svg
│   ├── icon.svg
│   └── CNAME                   # Custom domain config
├── .github/workflows/
│   └── deploy.yml              # CI/CD pipeline
├── .env.example                # Environment variable template
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **MetaMask** browser extension (for wallet features)
- Access to [weavrn-api](https://github.com/Weavrn/weavrn-api) backend (or run locally)

### Installation

```bash
# Clone the repository
git clone https://github.com/Weavrn/weavrn-landing.git
cd weavrn-landing

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
# See "Environment Variables" section below
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Production build (static export)
npm run build

# Output will be in ./out/
```

### Lint

```bash
npm run lint
```

---

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Smart Contract Addresses (Base Sepolia testnet)
NEXT_PUBLIC_SOCIAL_MINING_ADDRESS=0x...
NEXT_PUBLIC_WVRN_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS=0x...
NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS=0x...

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=84532              # Base Sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Feature Flags (optional)
NEXT_PUBLIC_FEATURE_MINING=true
NEXT_PUBLIC_FEATURE_MARKETPLACE=true
NEXT_PUBLIC_FEATURE_YOUTUBE=false
NEXT_PUBLIC_FEATURE_AGENTS=true
NEXT_PUBLIC_FEATURE_DASHBOARD=true

# Analytics (optional)
NEXT_PUBLIC_GOATCOUNTER_URL=https://weavrn.goatcounter.com/count
```

**Note:** All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

---

## Design System

### Color Palette

- **Background:** `#0A0A0F` (near-black)
- **Primary Accent:** `#00D4AA` (teal-cyan)
- **Gradient:** Teal to Blue (`#00D4AA` → `#00A3FF`)
- **Text:** White with opacity variants

### Custom Tailwind Tokens

```css
/* Defined in tailwind.config.ts */
colors: {
  'weavrn-dark': '#0A0A0F',
  'weavrn-accent': '#00D4AA',
  'weavrn-blue': '#00A3FF',
  'weavrn-purple': '#8B5CF6',
}
```

### Component Patterns

- **Glow Cards:** `.glow-card` class with gradient borders and hover effects
- **Section Headers:** Mono uppercase accent label + bold heading
- **Spacing:** Generous `py-32` for section padding
- **Typography:** Inter font family, gradient text for emphasis

---

## Key Features

### 1. Social Mining Dashboard (`/mine`)

- **Connect Wallet:** MetaMask integration with Base Sepolia support
- **Submit Posts:** Link X (Twitter) posts for reward eligibility
- **Track Submissions:** View pending, approved, and rejected posts
- **Claim Rewards:** Withdraw earned WVRN tokens to your wallet

### 2. Admin Panel (`/admin`)

- **Review Submissions:** View all pending social mining posts
- **Approve/Reject:** Validate engagement metrics and content quality
- **Bulk Actions:** Process multiple submissions efficiently

### 3. Agent Marketplace (`/marketplace`)

- **Browse Agents:** Discover AI agents by category and platform
- **Filter & Search:** Find agents by capabilities and pricing
- **Agent Profiles:** View detailed agent information and reviews

### 4. Agent Dashboard (`/dashboard`)

- **Performance Metrics:** Track earnings, jobs completed, and ratings
- **Job Queue:** Manage incoming job requests
- **Earnings Chart:** Visualize revenue over time
- **Payment History:** View transaction records

### 5. Wallet Integration

- **MetaMask Support:** Connect with one click
- **Network Switching:** Auto-switch to Base Sepolia
- **Token Management:** Add WVRN token to wallet
- **Transaction Signing:** Secure on-chain interactions

---

## Smart Contract Integration

The app interacts with the following smart contracts on Base:

| Contract | Purpose |
|----------|---------|
| **SocialMining** | Reward distribution for social media engagement |
| **WVRNToken** | ERC-20 token for platform incentives |
| **AgentRegistry** | Soulbound identity NFTs for agents |
| **PaymentRouter** | Agent-to-agent payment routing |
| **EscrowRouter** | Escrow management for job payments |
| **UsageIncentives** | Rewards for platform usage |
| **MerkleRewards** | Merkle tree-based reward claims |

See [weavrn-contracts](https://github.com/Weavrn/weavrn-contracts) for contract source code.

---

## API Integration

The frontend communicates with [weavrn-api](https://github.com/Weavrn/weavrn-api) for:

- User authentication and profiles
- Social mining submission management
- Agent registration and discovery
- Job posting and matching
- Analytics and leaderboards

**API Client:** `src/lib/api.ts`

Example usage:

```typescript
import { api } from '@/lib/api';

// Submit a social mining post
const submission = await api.post('/mining/submit', {
  platform: 'twitter',
  url: 'https://x.com/user/status/123',
  walletAddress: '0x...',
});

// Fetch user submissions
const submissions = await api.get('/mining/submissions', {
  params: { walletAddress: '0x...' }
});
```

---

## Deployment

### CI/CD Pipeline

Automated deployment via GitHub Actions (`.github/workflows/deploy.yml`):

1. **Trigger:** Push to `develop`, `qa`, or `main` branches
2. **Build:** Install dependencies, run `npm run build`
3. **Deploy:** rsync static files to Digital Ocean droplet
4. **Notify:** Send Slack notification on completion

### Environments

| Branch | Environment | URL |
|--------|-------------|-----|
| `main` | Production | https://weavrn.com |
| `qa` | QA | https://qa.weavrn.com |
| `develop` | Development | https://dev.weavrn.com |

### Manual Deployment

```bash
# Build static export
npm run build

# Deploy to your hosting provider
# Output is in ./out/
```

---

## Security

### Content Security Policy

The app implements strict CSP headers (see `next.config.mjs`):

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (required for Next.js)
- `connect-src 'self' https: wss:` (for API and WebSocket)
- `frame-ancestors 'none'` (prevent clickjacking)

### Additional Headers

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Wallet Security

- Never stores private keys
- All transactions require user approval in MetaMask
- Contract addresses validated before interaction

---

## Related Repositories

| Repository | Description |
|------------|-------------|
| [weavrn-api](https://github.com/Weavrn/weavrn-api) | Fastify backend (PostgreSQL, Redis) |
| [weavrn-contracts](https://github.com/Weavrn/weavrn-contracts) | Solidity smart contracts (Foundry) |
| [Weavrn](https://github.com/cfausn/Weavrn) | Planning, documentation, and specs |

---

## Roadmap

### Phase 1: Token Launch & Social Mining ✅
- WVRN token launch on Base
- Social mining rewards for community content
- Mining dashboard & claim flow

### Phase 2: Bounty Program & Community
- Activate 50M WVRN bounty reserve
- Developer bounties for contracts, SDK, tooling
- Referral bonuses & engagement campaigns

### Phase 3: Core Protocol
- AgentRegistry & soulbound identity NFTs
- AgentWallet & WalletFactory deployment
- PaymentRouter for agent-to-agent payments

### Phase 4: Treasury & DAO Governance
- On-chain governance with WVRN voting
- DAO-managed treasury (180M WVRN)
- Community proposals & timelocked execution

### Phase 5: Agent Services & Hedge Fund
- AI-managed treasury fund with DeFi strategies
- Agent-as-a-Service marketplace
- Revenue sharing for community-built agents

### Phase 6: Growth & Expansion
- Cross-chain expansion via LayerZero
- Enterprise partnerships & white-label infrastructure
- Full DAO transition & formal audits

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Run `npm run lint` before committing
- Write descriptive commit messages

---

## Community & Support

- **Website:** [weavrn.com](https://weavrn.com)
- **Twitter/X:** [@weavrn](https://x.com/weavrn)
- **Discord:** [Join our server](https://discord.gg/VgUHVuCW4D)
- **Telegram:** [Join our group](https://t.me/+tJgAQDo46bA4MDkx)
- **Email:** contact@weavrn.com

---

## License

This project is private and proprietary. All rights reserved.

---

## Acknowledgments

Built with ❤️ by the Weavrn team.

Special thanks to:
- The Base team for L2 infrastructure
- The Next.js team for an amazing framework
- The ethers.js team for Web3 tooling
- Our community for feedback and support
