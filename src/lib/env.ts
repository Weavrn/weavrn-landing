import { isAddress } from "ethers";

/**
 * Environment variable validation and type-safe access
 * This file validates all required environment variables at build time
 * and provides type-safe access to them throughout the application.
 */

// Required environment variables that must be set
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_CHAIN_ID",
] as const;

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = [
  "NEXT_PUBLIC_SOCIAL_MINING_ADDRESS",
  "NEXT_PUBLIC_WVRN_TOKEN_ADDRESS",
  "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS",
  "NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS",
  "NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS",
  "NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS",
  "NEXT_PUBLIC_RPC_URL",
  "NEXT_PUBLIC_GOATCOUNTER_URL",
  "NEXT_PUBLIC_FEATURE_MINING",
  "NEXT_PUBLIC_FEATURE_MARKETPLACE",
  "NEXT_PUBLIC_FEATURE_YOUTUBE",
  "NEXT_PUBLIC_FEATURE_AGENTS",
  "NEXT_PUBLIC_FEATURE_DASHBOARD",
] as const;

/**
 * Validates that all required environment variables are set
 * Should be called at build time or app initialization
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Validate API URL format
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && !isValidUrl(apiUrl)) {
    invalid.push(`NEXT_PUBLIC_API_URL: Invalid URL format "${apiUrl}"`);
  }

  // Validate chain ID
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (chainId && !isValidChainId(chainId)) {
    invalid.push(`NEXT_PUBLIC_CHAIN_ID: Invalid chain ID "${chainId}"`);
  }

  // Validate contract addresses if provided
  const addressVars = [
    "NEXT_PUBLIC_SOCIAL_MINING_ADDRESS",
    "NEXT_PUBLIC_WVRN_TOKEN_ADDRESS",
    "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS",
    "NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS",
    "NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS",
    "NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS",
  ];

  for (const varName of addressVars) {
    const value = process.env[varName];
    if (value && !isAddress(value)) {
      invalid.push(`${varName}: Invalid Ethereum address "${value}"`);
    }
  }

  // Report errors
  if (missing.length > 0 || invalid.length > 0) {
    const errors: string[] = [];
    
    if (missing.length > 0) {
      errors.push(
        "Missing required environment variables:",
        ...missing.map(v => `  - ${v}`)
      );
    }
    
    if (invalid.length > 0) {
      errors.push(
        "Invalid environment variable values:",
        ...invalid.map(v => `  - ${v}`)
      );
    }
    
    errors.push(
      "",
      "Please check your .env.local file and ensure all required variables are set correctly.",
      "See .env.example for reference."
    );
    
    throw new Error(errors.join("\n"));
  }
}

/**
 * Type-safe environment variable access
 */
export const env = {
  // Required variables
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "",
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID || "84532",
  
  // Contract addresses (optional)
  contracts: {
    socialMining: process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || null,
    wvrnToken: process.env.NEXT_PUBLIC_WVRN_TOKEN_ADDRESS || null,
    agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || null,
    paymentRouter: process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS || null,
    escrowRouter: process.env.NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS || null,
    usageIncentives: process.env.NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS || null,
    merkleRewards: process.env.NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS || null,
  },
  
  // Network configuration
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || null,
  
  // Analytics
  goatcounterUrl: process.env.NEXT_PUBLIC_GOATCOUNTER_URL || null,
  
  // Feature flags
  features: {
    mining: process.env.NEXT_PUBLIC_FEATURE_MINING === "true",
    marketplace: process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE === "true",
    youtube: process.env.NEXT_PUBLIC_FEATURE_YOUTUBE === "true",
    agents: process.env.NEXT_PUBLIC_FEATURE_AGENTS === "true",
    dashboard: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD === "true",
  },
  
  // Environment info
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const;

/**
 * Helper to check if a contract address is configured
 */
export function hasContract(name: keyof typeof env.contracts): boolean {
  return env.contracts[name] !== null;
}

/**
 * Helper to get a contract address or throw if not configured
 */
export function requireContract(name: keyof typeof env.contracts): string {
  const address = env.contracts[name];
  if (!address) {
    throw new Error(
      `Contract address for ${name} is not configured. ` +
      `Please set NEXT_PUBLIC_${name.toUpperCase()}_ADDRESS in your .env.local file.`
    );
  }
  return address;
}

// Validation helpers

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidChainId(chainId: string): boolean {
  const id = parseInt(chainId);
  return !isNaN(id) && id > 0 && id.toString() === chainId;
}

// Validate environment on module load (server-side only)
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("\n❌ Environment validation failed:\n");
      console.error((error as Error).message);
      console.error("\n");
      process.exit(1);
    }
  }
}
