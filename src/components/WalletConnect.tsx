"use client";

import { useState, useCallback } from "react";

interface WalletConnectProps {
  onConnect: (address: string) => void;
  address: string | null;
}

export default function WalletConnect({
  onConnect,
  address,
}: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  const connectMetaMask = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask or enter your wallet address manually.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts[0]) onConnect(accounts[0]);
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, [onConnect]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualAddress.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      onConnect(trimmed);
    } else {
      alert("Invalid Ethereum address.");
    }
  };

  if (address) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-weavrn-surface border border-weavrn-border text-sm">
        <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
        <span className="text-weavrn-muted font-mono text-xs">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={connectMetaMask}
        disabled={connecting}
        className="w-full px-4 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="0x... (manual entry)"
          className="flex-1 px-3 py-2.5 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors font-mono text-xs placeholder:text-weavrn-muted/50"
        />
        <button
          type="submit"
          className="px-4 py-2.5 border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg text-sm transition-all duration-300"
        >
          Link
        </button>
      </form>
    </div>
  );
}
