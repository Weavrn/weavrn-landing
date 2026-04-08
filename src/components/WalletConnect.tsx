"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { JsonRpcSigner } from "ethers";
import { getProviderAndSigner, checkAndSwitchChain, getChainConfig } from "@/lib/contracts";
import { clearSession } from "@/lib/api";

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

  // Auto-connect on mount if MetaMask is already authorized
  const tried = useRef(false);
  const connected = useRef(false);
  useEffect(() => {
    if (tried.current || address) return;
    tried.current = true;
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts: string[]) => {
      if (accounts.length === 0 || connected.current) return;
      try {
        const switched = await checkAndSwitchChain();
        if (!switched || connected.current) return;
        const { signer, address: addr } = await getProviderAndSigner();
        if (connected.current) return;
        connected.current = true;
        onConnect(addr, signer);
      } catch {
        // silent fail on auto-connect
      }
    }).catch((err: { code?: number }) => { if (err?.code !== 4001) console.warn("Auto-connect failed:", err); });
  }, [address, onConnect]);

  // Listen for chain/account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChainChanged = async () => {
      try {
        const switched = await checkAndSwitchChain();
        if (!switched) onDisconnect();
      } catch {
        onDisconnect();
      }
    };
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        clearSession();
        onDisconnect();
      } else {
        clearSession();
        try {
          const { signer: newSigner, address: newAddr } = await getProviderAndSigner();
          onConnect(newAddr, newSigner);
        } catch {
          onDisconnect();
        }
      }
    };
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [onDisconnect]);

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
      if (!connected.current) {
        connected.current = true;
        onConnect(addr, signer);
      }
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
          <div className="w-2 h-2 rounded-full bg-weavrn-accent" />
          <span className="text-weavrn-muted font-mono text-xs">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="text-weavrn-muted/50 font-mono text-[10px]">
            {getChainConfig().name}
          </span>
        </div>
        <button
          onClick={async () => {
            await clearSession();
            try {
              await window.ethereum?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
            } catch { /* older MetaMask versions don't support this */ }
            onDisconnect();
          }}
          data-testid="disconnect-btn"
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
        data-testid="connect-wallet-btn"
        className="px-5 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
