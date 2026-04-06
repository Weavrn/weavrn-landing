"use client";

import { useState, useCallback, useEffect } from "react";
import { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import AgentDashboard from "@/components/AgentDashboard";
import Footer from "@/components/Footer";
import { hasSession, createSession } from "@/lib/api";

export default function DashboardPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const handleConnect = useCallback(
    (addr: string, s: JsonRpcSigner) => {
      setAddress(addr);
      setSigner(s);
    },
    [],
  );

  // Create a session on connect (one MetaMask signature for the entire dashboard visit)
  useEffect(() => {
    if (!address || !signer) { setSessionReady(false); return; }
    if (hasSession()) { setSessionReady(true); return; }
    createSession(signer, address)
      .then(() => setSessionReady(true))
      .catch(() => setSessionReady(true)); // proceed even if session fails — fallback to per-request
  }, [address, signer]);

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
        ) : !sessionReady ? (
          <div className="max-w-lg mx-auto text-center py-20">
            <p className="text-weavrn-muted">Authenticating...</p>
          </div>
        ) : (
          <div className="pt-4">
            <div className="text-center mb-12">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                <span className="gradient-text">Dashboard</span>
              </h1>
              <p className="text-sm text-weavrn-muted">
                Deploy agents, manage listings, and track jobs
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
