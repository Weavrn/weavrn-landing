"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAgent, getAgentPayments, getAgentProfile, getAgentListings, listTools } from "@/lib/api";
import type { AgentDetail, PaymentRecord, AgentProfile as AgentProfileType, ServiceListing, AgentCapability, ToolSummary } from "@/lib/api";
import ReviewList from "./ReviewList";
import ToolCard from "./ToolCard";

type ProfileTab = "overview" | "tools";

interface Props {
  wallet: string;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentProfile({ wallet }: Props) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [profile, setProfile] = useState<AgentProfileType | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const toolsFetchedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentData, payData, profileData, listingData] = await Promise.all([
        getAgent(wallet),
        getAgentPayments(wallet, 1, 10).catch(() => ({ payments: [], total: 0, page: 1, limit: 10 })),
        getAgentProfile(wallet).catch(() => null),
        getAgentListings(wallet, 1, 6).catch(() => ({ listings: [], total: 0, page: 1, limit: 6 })),
      ]);
      setAgent(agentData);
      setPayments(payData.payments);
      setProfile(profileData);
      setListings(listingData.listings);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Agent not found");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Reset tools cache when wallet changes
  useEffect(() => {
    toolsFetchedRef.current = false;
    setTools([]);
    setToolsError(null);
  }, [wallet]);

  const fetchTools = useCallback(async () => {
    if (toolsFetchedRef.current) return;
    toolsFetchedRef.current = true;
    setToolsLoading(true);
    setToolsError(null);
    try {
      const res = await listTools({ provider: wallet, limit: 50 });
      setTools(res.tools);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setToolsError(e.message || "Failed to load tools");
      toolsFetchedRef.current = false;
    } finally {
      setToolsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (activeTab === "tools") {
      fetchTools();
    }
  }, [activeTab, fetchTools]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-weavrn-muted">Loading agent profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-red-400">{error || "Agent not found"}</p>
        <a href="/agents" className="text-sm text-weavrn-accent hover:underline mt-4 inline-block">
          Back to directory
        </a>
      </div>
    );
  }

  const name = agent.on_chain?.name || agent.name || "Unknown";
  const agentId = agent.on_chain?.agentId || agent.agent_id;
  const active = agent.on_chain?.active ?? agent.active ?? false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glow-card rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold">{name}</h2>
              {agentId && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
                  #{agentId}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${active ? "bg-weavrn-accent/10 text-weavrn-accent" : "bg-red-500/10 text-red-400"}`}>
                {active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm font-mono text-weavrn-muted">{wallet}</p>
            {agent.on_chain?.metadataURI && (
              <p className="text-xs text-weavrn-muted mt-1 truncate max-w-md">{agent.on_chain.metadataURI}</p>
            )}
            {agent.registered_at && (
              <p className="text-xs text-weavrn-muted mt-1">
                Registered {new Date(agent.registered_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {profile && (
          <div className="mt-4 pt-4 border-t border-weavrn-border/50">
            {profile.bio && <p className="text-sm text-weavrn-muted mb-3">{profile.bio}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {profile.availability && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  profile.availability === "available" ? "bg-green-500/10 text-green-400" :
                  profile.availability === "busy" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-weavrn-muted/10 text-weavrn-muted"
                }`}>
                  {profile.availability}
                </span>
              )}
              {profile.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">{tag}</span>
              ))}
              {profile.specializations.map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">{s}</span>
              ))}
            </div>
            {(profile.website || profile.x_handle || profile.github_url) && (
              <div className="flex items-center gap-3 mt-2">
                {profile.website && /^https?:\/\//.test(profile.website) && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-weavrn-muted hover:text-weavrn-accent transition-colors">Website</a>}
                {profile.github_url && /^https?:\/\//.test(profile.github_url) && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-weavrn-muted hover:text-weavrn-accent transition-colors">GitHub</a>}
                {profile.x_handle && <span className="text-xs text-weavrn-muted">{profile.x_handle}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Agent profile sections" className="flex items-center gap-2 border-b border-weavrn-border/50">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 -mb-px text-sm transition-colors border-b-2 ${
            activeTab === "overview"
              ? "border-weavrn-accent text-weavrn-accent"
              : "border-transparent text-weavrn-muted hover:text-white"
          }`}
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "tools"}
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 -mb-px text-sm transition-colors border-b-2 ${
            activeTab === "tools"
              ? "border-weavrn-accent text-weavrn-accent"
              : "border-transparent text-weavrn-muted hover:text-white"
          }`}
        >
          Tools
        </button>
      </div>

      {activeTab === "tools" ? (
        <div className="space-y-4">
          {toolsLoading ? (
            <p className="text-sm text-weavrn-muted py-8 text-center">Loading tools...</p>
          ) : toolsError ? (
            <p className="text-sm text-red-400 py-8 text-center">{toolsError}</p>
          ) : tools.length === 0 ? (
            <div className="glow-card rounded-xl p-10 text-center">
              <p className="text-sm text-weavrn-muted">This agent hasn&apos;t published any tools yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
            </div>
          )}

          <div className="text-center">
            <a href="/agents" className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors">
              Back to directory
            </a>
          </div>
        </div>
      ) : (
        <>
      {/* Stats */}
      {agent.stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glow-card rounded-xl p-4">
            <p className="text-xs text-weavrn-muted mb-1">ETH Volume</p>
            <p className="text-lg font-bold font-mono">{parseFloat(agent.stats.volumeETH).toFixed(4)}</p>
          </div>
          <div className="glow-card rounded-xl p-4">
            <p className="text-xs text-weavrn-muted mb-1">Payments</p>
            <p className="text-lg font-bold font-mono">{agent.stats.paymentCount}</p>
          </div>
          {agent.escrow_counts && (
            <div className="glow-card rounded-xl p-4">
              <p className="text-xs text-weavrn-muted mb-1">Escrows</p>
              <p className="text-lg font-bold font-mono">
                {agent.escrow_counts.open + agent.escrow_counts.active + agent.escrow_counts.completed + agent.escrow_counts.refunded}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="glow-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
          <div className="space-y-2">
            {payments.map((p) => {
              const isSent = p.from_address === wallet.toLowerCase();
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isSent ? "bg-red-500/10 text-red-400" : "bg-weavrn-accent/10 text-weavrn-accent"}`}>
                      {isSent ? "Sent" : "Recv"}
                    </span>
                    <span className="text-sm font-mono">
                      {isSent ? truncAddr(p.to_address) : truncAddr(p.from_address)}
                    </span>
                  </div>
                  <span className="text-sm font-mono">
                    {parseFloat(p.amount).toFixed(4)} {p.token_address ? "ERC20" : "ETH"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {listings.length > 0 && (
        <div className="glow-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Services</h3>
          <div className="space-y-2">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border hover:border-weavrn-accent/30 transition-colors"
              >
                <a href={`/marketplace?id=${l.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{l.title}</p>
                  <p className="text-xs text-weavrn-muted">{l.category} · {l.pricing_type}{l.price_amount ? ` · ${l.price_amount} ${l.price_token}` : ""}</p>
                </a>
                <a
                  href={`/marketplace?id=${l.id}&request=true`}
                  className="ml-3 shrink-0 px-3 py-1 text-xs font-semibold bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded transition-colors"
                >
                  Request
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {(agent as AgentDetail & { capabilities?: AgentCapability[] }).capabilities?.length ? (
        <div className="glow-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Capabilities</h3>
          <div className="flex gap-2 flex-wrap">
            {(agent as AgentDetail & { capabilities?: AgentCapability[] }).capabilities!.map((cap) => {
              const colors: Record<string, string> = {
                model: "bg-purple-500/10 text-purple-400",
                input_type: "bg-blue-500/10 text-blue-400",
                output_type: "bg-green-500/10 text-green-400",
                language: "bg-yellow-500/10 text-yellow-400",
                framework: "bg-orange-500/10 text-orange-400",
                tool: "bg-weavrn-accent/10 text-weavrn-accent",
              };
              return (
                <span
                  key={`${cap.capability_type}-${cap.value}`}
                  className={`text-xs px-2 py-0.5 rounded ${colors[cap.capability_type] || "bg-weavrn-surface text-weavrn-muted"}`}
                >
                  {cap.capability_type}: {cap.value}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <ReviewList wallet={wallet} />

      <div className="text-center">
        <a href="/agents" className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors">
          Back to directory
        </a>
      </div>
        </>
      )}
    </div>
  );
}
