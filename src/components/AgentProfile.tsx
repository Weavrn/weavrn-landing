"use client";

import { useState, useEffect, useCallback } from "react";
import { getAgent, getAgentPayments } from "@/lib/api";
import type { AgentDetail, PaymentRecord } from "@/lib/api";

interface Props {
  wallet: string;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentProfile({ wallet }: Props) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentData, payData] = await Promise.all([
        getAgent(wallet),
        getAgentPayments(wallet, 1, 10).catch(() => ({ payments: [], total: 0, page: 1, limit: 10 })),
      ]);
      setAgent(agentData);
      setPayments(payData.payments);
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
      </div>

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
                {agent.escrow_counts.open + agent.escrow_counts.released + agent.escrow_counts.refunded}
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

      <div className="text-center">
        <a href="/agents" className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors">
          Back to directory
        </a>
      </div>
    </div>
  );
}
