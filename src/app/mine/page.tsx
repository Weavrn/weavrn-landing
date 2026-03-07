"use client";

import { useState, useCallback } from "react";
import WalletConnect from "@/components/WalletConnect";
import MiningDashboard from "@/components/MiningDashboard";
import Footer from "@/components/Footer";

export default function MinePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [xHandle, setXHandle] = useState<string | null>(null);

  const handleConnect = useCallback((address: string) => {
    setWalletAddress(address);
  }, []);

  const handleLinkX = useCallback(
    async (handle: string) => {
      if (!walletAddress) return;
      try {
        const res = await fetch("/api/auth/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: walletAddress,
            x_handle: handle,
          }),
        });
        if (res.ok) {
          setXHandle(handle);
        }
      } catch {
        alert("Failed to link X account.");
      }
    },
    [walletAddress]
  );

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      {/* Header */}
      <header className="relative z-20 border-b border-weavrn-border/50 px-6 py-4 backdrop-blur-sm bg-weavrn-dark/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold gradient-text">
            weavrn
          </a>
          <div className="flex items-center gap-4">
            {xHandle && (
              <span className="text-sm text-weavrn-muted font-mono">@{xHandle}</span>
            )}
            <WalletConnect onConnect={handleConnect} address={walletAddress} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
              Social Mining
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Create. Share. <span className="gradient-text">Earn.</span>
            </h1>
            <p className="text-weavrn-muted max-w-lg mx-auto">
              Post about AI agents and the Weavrn ecosystem on X. Earn WVRN
              tokens based on engagement.
            </p>
          </div>

          {!walletAddress ? (
            <div className="max-w-sm mx-auto text-center">
              <div className="glow-card rounded-2xl p-8">
                <p className="text-weavrn-muted mb-6 text-sm">
                  Connect your wallet to start mining.
                </p>
                <WalletConnect onConnect={handleConnect} address={walletAddress} />
              </div>
            </div>
          ) : (
            <MiningDashboard
              walletAddress={walletAddress}
              xHandle={xHandle}
              onLinkX={handleLinkX}
            />
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
