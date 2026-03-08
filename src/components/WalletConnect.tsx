"use client";

import { useState, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getProviderAndSigner, checkAndSwitchChain, getChainConfig } from "@/lib/contracts";

interface WalletConnectProps {
  onConnect: (address: string, signer: JsonRpcSigner) => void;
  onDisconnect: () => void;
  address: string | null;
}

export default function WalletConnect({
  onConnect,
  onDisconnect,
  address,
}: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("Install MetaMask to continue");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const switched = await checkAndSwitchChain();
      if (!switched) {
        setError(`Switch to ${getChainConfig().name} to continue`);
        return;
      }
      const { signer, address: addr } = await getProviderAndSigner();
      onConnect(addr, signer);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001) return; // user rejected
      setError(e.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [onConnect]);

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-weavrn-surface border border-weavrn-border text-sm">
          <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
          <span className="text-weavrn-muted font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="text-weavrn-muted/50 font-mono text-[10px]">
            {getChainConfig().name}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-weavrn-muted hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={connect}
        disabled={connecting}
        className="px-5 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
