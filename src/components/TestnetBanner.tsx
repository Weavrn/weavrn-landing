"use client";

import { useEffect, useState } from "react";

// Testnet chain IDs that should trigger the banner
const TESTNET_CHAIN_IDS = ["84532", "11155111", "80002", "421614", "11155420"];

// Chain ID to network name mapping
const NETWORK_NAMES: Record<string, string> = {
  "84532": "Base Sepolia",
  "11155111": "Ethereum Sepolia",
  "80002": "Polygon Amoy",
  "421614": "Arbitrum Sepolia",
  "11155420": "Optimism Sepolia",
};

export default function TestnetBanner() {
  const [isTestnet, setIsTestnet] = useState(false);
  const [networkName, setNetworkName] = useState<string>("Testnet");

  useEffect(() => {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";
    
    if (TESTNET_CHAIN_IDS.includes(chainId)) {
      setIsTestnet(true);
      setNetworkName(NETWORK_NAMES[chainId] || "Testnet");
    }
  }, []);

  if (!isTestnet) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      <span className="inline-flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        You are currently on <strong>{networkName}</strong>. This is a test network -
        assets have no real value.
      </span>
    </div>
  );
}
