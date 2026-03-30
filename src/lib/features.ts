// Feature flags — toggled by environment variables
// Set in .env.local (local dev), GitHub Actions vars (deploy), or Cloudflare (edge)

export const features = {
  mining: process.env.NEXT_PUBLIC_FEATURE_MINING === "true",
  marketplace: process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE === "true",
  youtube: process.env.NEXT_PUBLIC_FEATURE_YOUTUBE === "true",
  agents: process.env.NEXT_PUBLIC_FEATURE_AGENTS === "true",
  dashboard: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD === "true",
} as const;
