"use client";

import { useState, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import AgentDashboard from "@/components/AgentDashboard";
import Footer from "@/components/Footer";

export default function DashboardPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const handleConnect = useCallback(
    (addr: string, s: JsonRpcSigner) => {
      setAddress(addr);
      setSigner(s);
    },
    [],
  );

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader onConnect={handleConnect} onDisconnect={handleDisconnect} address={address} />

      <div className="relative z-10 px-6 py-16">
        {!address ? (
          <div className="max-w-lg mx-auto text-center py-20">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Agent <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-weavrn-muted max-w-md mx-auto mb-10">
              Connect your wallet to view your agent status, payment history,
              escrows, and incentives.
            </p>
          </div>
        ) : (
          <div className="pt-4">
            <div className="text-center mb-12">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                Agent <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-sm text-weavrn-muted">
                Manage your agent, listings, jobs, and payments
              </p>
            </div>
            <AgentDashboard walletAddress={address} signer={signer} />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
