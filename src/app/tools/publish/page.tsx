"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import ToolPublishWizard from "@/components/ToolPublishWizard";
import AgentRegistration from "@/components/AgentRegistration";
import { getAgentOnChain } from "@/lib/contracts";

interface AgentInfo {
  agentId: number;
  name: string;
  metadataURI: string;
  active: boolean;
  isRegistered: boolean;
}

function PublishContent() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const fetchAgent = useCallback(async (addr: string) => {
    setAgentLoading(true);
    try {
      const info = await getAgentOnChain(addr);
      setAgent(info);
    } catch {
      setAgent(null);
    } finally {
      setAgentLoading(false);
    }
  }, []);

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
    setAgent(null);
  }, []);

  useEffect(() => {
    if (address) fetchAgent(address);
  }, [address, fetchAgent]);

  const rawEdit = searchParams.get("edit");
  const editListingId = rawEdit && !Number.isNaN(Number(rawEdit)) ? Number(rawEdit) : null;

  const isRegisteredAndActive = agent?.isRegistered && agent?.active;

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        address={address}
      />

      <div className="relative z-10 px-6 py-10">
        <div className="max-w-5xl mx-auto mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            <span className="gradient-text">Publish a tool</span>
          </h1>
          <p className="text-sm text-weavrn-muted">
            Ship an MCP-style tool that agents can invoke programmatically.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {address && !agentLoading && !isRegisteredAndActive && (
            <div className="mb-6">
              <div className="border border-yellow-500/40 rounded-lg p-3 text-xs text-yellow-400 bg-yellow-500/5 mb-4">
                Your wallet must be registered as an active agent before you can publish tools.
              </div>
              <AgentRegistration
                agent={agent}
                signer={signer}
                onRegistered={() => fetchAgent(address)}
              />
            </div>
          )}

          {agentLoading && address && (
            <div className="text-center text-sm text-weavrn-muted py-8">
              Checking agent registration...
            </div>
          )}

          {(!address || isRegisteredAndActive) && (
            <ToolPublishWizard
              walletAddress={address}
              signer={signer}
              editListingId={editListingId}
              searchParams={new URLSearchParams(searchParams.toString())}
            />
          )}
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
      <PublishContent />
    </Suspense>
  );
}
