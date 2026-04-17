"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import ToolPublishWizard from "@/components/ToolPublishWizard";
import AgentRegistration from "@/components/AgentRegistration";
import { getAgentOnChain } from "@/lib/contracts";
import { getHostedAgents, hasSession, type HostedAgentSummary } from "@/lib/api";

interface AgentInfo {
  agentId: number;
  name: string;
  metadataURI: string;
  active: boolean;
  isRegistered: boolean;
}

const OWNER_OPTION = "__owner__";

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function PublishContent() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const [hostedAgents, setHostedAgents] = useState<HostedAgentSummary[]>([]);
  const [hostedLoading, setHostedLoading] = useState(false);
  const [hostedError, setHostedError] = useState<string | null>(null);
  const [hostedLoaded, setHostedLoaded] = useState(false);
  const [selected, setSelected] = useState<string>(OWNER_OPTION);

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

  const fetchHosted = useCallback(async (addr: string, s: JsonRpcSigner) => {
    setHostedLoading(true);
    setHostedError(null);
    try {
      const agents = await getHostedAgents(s, addr);
      setHostedAgents(agents.filter((a) => a.active));
      setHostedLoaded(true);
    } catch (err) {
      setHostedError((err as Error).message || "Failed to load hosted agents");
    } finally {
      setHostedLoading(false);
    }
  }, []);

  const handleConnect = useCallback((addr: string, s: JsonRpcSigner) => {
    setAddress(addr);
    setSigner(s);
  }, []);
  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setAgent(null);
    setHostedAgents([]);
    setHostedLoaded(false);
    setHostedError(null);
    setSelected(OWNER_OPTION);
  }, []);

  useEffect(() => {
    if (address) fetchAgent(address);
  }, [address, fetchAgent]);

  // Lazy-load hosted agents if the user already has a session (e.g. came from
  // /dashboard). Otherwise wait for an explicit click so we don't force a
  // signature on users who just want to publish under their own wallet.
  useEffect(() => {
    if (address && signer && hasSession() && !hostedLoaded) {
      fetchHosted(address, signer);
    }
  }, [address, signer, hostedLoaded, fetchHosted]);

  const rawEdit = searchParams.get("edit");
  const editListingId = rawEdit && !Number.isNaN(Number(rawEdit)) ? Number(rawEdit) : null;

  const isRegisteredAndActive = !!(agent?.isRegistered && agent?.active);
  const publishingAsOwner = selected === OWNER_OPTION;
  const publishAsWallet = publishingAsOwner
    ? address
    : hostedAgents.find((a) => a.wallet_address.toLowerCase() === selected)?.wallet_address ?? address;

  // Registration gate only applies when publishing under the owner wallet.
  // Hosted agents are auto-registered on-chain at deploy time.
  const showOwnerRegistrationGate =
    !!address && publishingAsOwner && !agentLoading && !isRegisteredAndActive;

  const showWizard = !address || !publishingAsOwner || isRegisteredAndActive;

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
          {address && (
            <div className="glow-card rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <label className="text-xs uppercase tracking-wide text-weavrn-muted block mb-1">
                    Publish as
                  </label>
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="bg-weavrn-dark border border-weavrn-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-weavrn-accent/50 min-w-[260px]"
                    data-testid="publish-as-select"
                  >
                    <option value={OWNER_OPTION}>
                      My wallet ({truncAddr(address)})
                    </option>
                    {hostedAgents.map((a) => (
                      <option key={a.wallet_address} value={a.wallet_address.toLowerCase()}>
                        {a.agent_name || "Hosted agent"} ({truncAddr(a.wallet_address)})
                      </option>
                    ))}
                  </select>
                </div>
                {!hostedLoaded && signer && (
                  <button
                    type="button"
                    onClick={() => fetchHosted(address, signer)}
                    disabled={hostedLoading}
                    className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover transition-colors disabled:opacity-50"
                  >
                    {hostedLoading ? "Loading..." : "Load my hosted agents"}
                  </button>
                )}
              </div>
              {hostedError && (
                <p className="mt-2 text-xs text-red-400">{hostedError}</p>
              )}
              {hostedLoaded && hostedAgents.length === 0 && (
                <p className="mt-2 text-xs text-weavrn-muted">
                  No hosted agents found. Deploy one from the{" "}
                  <a href="/dashboard" className="text-weavrn-accent hover:underline">
                    dashboard
                  </a>
                  .
                </p>
              )}
              {!publishingAsOwner && (
                <p className="mt-2 text-xs text-weavrn-accent">
                  Listing will be published under this hosted agent. Your connected wallet signs as the owner.
                </p>
              )}
            </div>
          )}

          {showOwnerRegistrationGate && (
            <div className="mb-6">
              <div className="border border-yellow-500/40 rounded-lg p-3 text-xs text-yellow-400 bg-yellow-500/5 mb-4">
                Your wallet must be registered as an active agent before you can publish tools under it.
                {hostedAgents.length > 0 && " Or switch to one of your hosted agents above."}
              </div>
              <AgentRegistration
                agent={agent}
                signer={signer}
                onRegistered={() => fetchAgent(address!)}
              />
            </div>
          )}

          {agentLoading && address && publishingAsOwner && (
            <div className="text-center text-sm text-weavrn-muted py-8">
              Checking agent registration...
            </div>
          )}

          {showWizard && (
            <ToolPublishWizard
              walletAddress={address}
              signer={signer}
              editListingId={editListingId}
              searchParams={new URLSearchParams(searchParams.toString())}
              publishAsWallet={publishAsWallet}
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
