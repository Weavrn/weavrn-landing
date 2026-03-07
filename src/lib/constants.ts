export const SOCIAL_LINKS = {
  twitter: "https://x.com/WeavrnProtocol",
  discord: "", // TODO: add Discord invite link
  telegram: "", // TODO: add Telegram link
  github: "https://github.com/weavrn",
} as const;

export const BUTTONDOWN_EMBED_URL = ""; // TODO: add Buttondown embed URL

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const TOKEN_ALLOCATIONS = [
  { label: "Agent Rewards", pct: 40, amount: "400M", color: "#00D4AA" },
  { label: "Treasury", pct: 18, amount: "180M", color: "#00A3FF" },
  { label: "Liquidity/MM", pct: 17, amount: "170M", color: "#00E5BB" },
  { label: "Development", pct: 10, amount: "100M", color: "#0088CC" },
  { label: "Founding Team", pct: 10, amount: "100M", color: "#00B8D4" },
  { label: "Bounty Reserve", pct: 5, amount: "50M", color: "#4DD0E1" },
] as const;

export const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    title: "Foundation",
    items: [
      "Token launch & social mining",
      "Community building",
      "Landing page & bounty program",
    ],
  },
  {
    phase: "Phase 2",
    title: "Core Protocol",
    items: [
      "AgentRegistry & soulbound NFTs",
      "AgentWallet & WalletFactory",
      "PaymentRouter deployment",
    ],
  },
  {
    phase: "Phase 3",
    title: "SDK & Integrations",
    items: [
      "TypeScript SDK release",
      "Agent framework integrations",
      "Developer documentation",
    ],
  },
  {
    phase: "Phase 4",
    title: "Growth",
    items: [
      "Cross-chain expansion",
      "Governance launch",
      "Enterprise partnerships",
    ],
  },
] as const;
