export const SOCIAL_LINKS = {
  twitter: "https://x.com/weavrn",
  discord: "", // TODO: add Discord invite link
  telegram: "", // TODO: add Telegram link
  github: "https://github.com/weavrn",
} as const;

export const CONTACT_EMAIL = "contact@weavrn.com";


export const TOKEN_ALLOCATIONS = [
  { label: "Usage Incentives", pct: 25, amount: "250M", color: "#8B5CF6" },
  { label: "Social Mining", pct: 15, amount: "150M", color: "#00D4AA" },
  { label: "Treasury", pct: 18, amount: "180M", color: "#00A3FF" },
  { label: "Liquidity/MM", pct: 17, amount: "170M", color: "#00E5BB" },
  { label: "Development", pct: 10, amount: "100M", color: "#0088CC" },
  { label: "Founding Team", pct: 10, amount: "100M", color: "#00B8D4" },
  { label: "Bounty Reserve", pct: 5, amount: "50M", color: "#4DD0E1" },
] as const;

export const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    title: "Token Launch & Social Mining",
    items: [
      "WVRN token launch on Base",
      "Social mining rewards for community content",
      "Mining dashboard & claim flow",
    ],
  },
  {
    phase: "Phase 2",
    title: "Bounty Program & Community",
    items: [
      "Activate 50M WVRN bounty reserve",
      "Developer bounties for contracts, SDK, tooling",
      "Referral bonuses & engagement campaigns",
    ],
  },
  {
    phase: "Phase 3",
    title: "Core Protocol",
    items: [
      "AgentRegistry & soulbound identity NFTs",
      "AgentWallet & WalletFactory deployment",
      "PaymentRouter for agent-to-agent payments",
    ],
  },
  {
    phase: "Phase 4",
    title: "Treasury & DAO Governance",
    items: [
      "On-chain governance with WVRN voting",
      "DAO-managed treasury (180M WVRN)",
      "Community proposals & timelocked execution",
    ],
  },
  {
    phase: "Phase 5",
    title: "Agent Services & Hedge Fund",
    items: [
      "AI-managed treasury fund with DeFi strategies",
      "Agent-as-a-Service marketplace",
      "Revenue sharing for community-built agents",
    ],
  },
  {
    phase: "Phase 6",
    title: "Growth & Expansion",
    items: [
      "Cross-chain expansion via LayerZero",
      "Enterprise partnerships & white-label infrastructure",
      "Full DAO transition & formal audits",
    ],
  },
] as const;
