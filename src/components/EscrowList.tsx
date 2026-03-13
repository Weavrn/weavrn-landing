"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import {
  releaseEscrow, claimStream, refundEscrow, getExplorerTxUrl,
  getStrategyType, getMilestoneInfo, getTrickleInfo,
  type MilestoneInfo, type TrickleInfo,
} from "@/lib/contracts";
import type { EscrowRecord } from "@/lib/api";

interface Props {
  escrows: EscrowRecord[];
  total: number;
  page: number;
  status: string | undefined;
  walletAddress: string;
  signer: JsonRpcSigner | null;
  onPageChange: (page: number) => void;
  onStatusChange: (status: string | undefined) => void;
  onAction: () => void;
}

type StatusTab = "all" | "open" | "active" | "completed" | "refunded";

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  active: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-weavrn-accent/10 text-weavrn-accent border-weavrn-accent/30",
  refunded: "bg-weavrn-muted/10 text-weavrn-muted border-weavrn-border",
};

const STRATEGY_LABELS: Record<string, string> = {
  all_or_nothing: "All or Nothing",
  milestone: "Milestone",
  trickle: "Trickle",
  unknown: "Standard",
};

export default function EscrowList({
  escrows,
  total,
  page,
  status,
  walletAddress,
  signer,
  onPageChange,
  onStatusChange,
  onAction,
}: Props) {
  const [acting, setActing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [milestoneCache, setMilestoneCache] = useState<Record<number, MilestoneInfo>>({});
  const [trickleCache, setTrickleCache] = useState<Record<number, TrickleInfo>>({});
  const wallet = walletAddress.toLowerCase();
  const totalPages = Math.ceil(total / 50);

  const loadStrategyInfo = useCallback(async () => {
    for (const e of escrows) {
      const strategyType = getStrategyType(e.strategy);
      if (strategyType === "milestone" && !milestoneCache[e.escrow_id] && e.strategy) {
        try {
          const info = await getMilestoneInfo(e.escrow_id, e.strategy);
          setMilestoneCache((prev) => ({ ...prev, [e.escrow_id]: info }));
        } catch { /* skip */ }
      }
      if (strategyType === "trickle" && !trickleCache[e.escrow_id] && e.strategy) {
        try {
          const info = await getTrickleInfo(e.escrow_id, e.strategy);
          setTrickleCache((prev) => ({ ...prev, [e.escrow_id]: info }));
        } catch { /* skip */ }
      }
    }
  }, [escrows, milestoneCache, trickleCache]);

  useEffect(() => {
    loadStrategyInfo();
  }, [escrows]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRelease = async (escrowId: number) => {
    if (!signer) return;
    setActing(escrowId);
    setError(null);
    try {
      await releaseEscrow(signer, escrowId);
      // Refresh milestone info after release
      setMilestoneCache((prev) => {
        const next = { ...prev };
        delete next[escrowId];
        return next;
      });
      onAction();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Release failed");
    } finally {
      setActing(null);
    }
  };

  const handleClaimStream = async (escrowId: number) => {
    if (!signer) return;
    setActing(escrowId);
    setError(null);
    try {
      await claimStream(signer, escrowId);
      setTrickleCache((prev) => {
        const next = { ...prev };
        delete next[escrowId];
        return next;
      });
      onAction();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Claim failed");
    } finally {
      setActing(null);
    }
  };

  const handleRefund = async (escrowId: number) => {
    if (!signer) return;
    setActing(escrowId);
    setError(null);
    try {
      await refundEscrow(signer, escrowId);
      onAction();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Refund failed");
    } finally {
      setActing(null);
    }
  };

  const activeTab: StatusTab = (status as StatusTab) || "all";

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Escrows</h2>
        <div className="flex gap-1">
          {(["all", "open", "active", "completed", "refunded"] as StatusTab[]).map((t) => (
            <button
              key={t}
              onClick={() => onStatusChange(t === "all" ? undefined : t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t
                  ? "bg-weavrn-accent/10 text-weavrn-accent border border-weavrn-accent/30"
                  : "text-weavrn-muted hover:text-white border border-transparent"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-weavrn-muted hover:text-white">x</button>
        </div>
      )}

      {escrows.length === 0 ? (
        <p className="text-sm text-weavrn-muted py-4 text-center">No escrows found</p>
      ) : (
        <div className="space-y-2">
          {escrows.map((e) => {
            const isSender = e.sender === wallet;
            const now = Date.now() / 1000;
            const pastDeadline = now > e.deadline;
            const deadlineDate = new Date(e.deadline * 1000);
            const strategyType = getStrategyType(e.strategy);
            const msInfo = milestoneCache[e.escrow_id];
            const trInfo = trickleCache[e.escrow_id];

            return (
              <div
                key={e.id}
                className="p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[e.status]}`}>
                      {e.status}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-mono">
                        {isSender ? `To ${truncAddr(e.recipient)}` : `From ${truncAddr(e.sender)}`}
                      </p>
                      <p className="text-xs text-weavrn-muted">
                        {STRATEGY_LABELS[strategyType]} · Deadline: {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString()}
                        {e.memo && ` — ${e.memo}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {parseFloat(e.amount).toFixed(4)} {e.token_address ? "ERC20" : "ETH"}
                      </p>
                      <a
                        href={getExplorerTxUrl(e.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-weavrn-muted hover:text-weavrn-accent"
                      >
                        {e.tx_hash.slice(0, 10)}...
                      </a>
                    </div>
                    {(e.status === "open" || e.status === "active") && (
                      <div className="flex gap-1">
                        {isSender && strategyType === "milestone" && msInfo && (
                          <button
                            onClick={() => handleRelease(e.escrow_id)}
                            disabled={acting === e.escrow_id || msInfo.currentMilestone >= msInfo.milestones.length}
                            className="px-2 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-xs font-semibold disabled:opacity-50"
                          >
                            Release M{msInfo.currentMilestone + 1}
                          </button>
                        )}
                        {isSender && strategyType !== "milestone" && strategyType !== "trickle" && (
                          <button
                            onClick={() => handleRelease(e.escrow_id)}
                            disabled={acting === e.escrow_id}
                            className="px-2 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-xs font-semibold disabled:opacity-50"
                          >
                            Release
                          </button>
                        )}
                        {!isSender && strategyType === "trickle" && e.status === "active" && (
                          <button
                            onClick={() => handleClaimStream(e.escrow_id)}
                            disabled={acting === e.escrow_id}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                          >
                            Claim{trInfo ? ` ${parseFloat(trInfo.claimable).toFixed(4)}` : ""}
                          </button>
                        )}
                        {!isSender && strategyType !== "trickle" && e.status === "active" && (
                          <button
                            onClick={() => handleClaimStream(e.escrow_id)}
                            disabled={acting === e.escrow_id}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                          >
                            Claim
                          </button>
                        )}
                        {isSender && pastDeadline && (
                          <button
                            onClick={() => handleRefund(e.escrow_id)}
                            disabled={acting === e.escrow_id}
                            className="px-2 py-1 border border-weavrn-border rounded text-xs text-weavrn-muted hover:text-white disabled:opacity-50"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone progress */}
                {strategyType === "milestone" && msInfo && (
                  <div className="mt-2 pt-2 border-t border-weavrn-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-weavrn-muted">
                        Milestone {Math.min(msInfo.currentMilestone, msInfo.milestones.length)}/{msInfo.milestones.length}
                      </span>
                      <span className="text-xs text-weavrn-muted">
                        {msInfo.milestones.slice(0, msInfo.currentMilestone).reduce((a, b) => a + b, 0) / 100}% released
                      </span>
                    </div>
                    <div className="h-1.5 bg-weavrn-border rounded-full overflow-hidden flex">
                      {msInfo.milestones.map((bp, i) => (
                        <div
                          key={i}
                          className={`h-full ${i < msInfo.currentMilestone ? "bg-weavrn-accent" : "bg-weavrn-border"} ${i > 0 ? "border-l border-weavrn-dark" : ""}`}
                          style={{ width: `${bp / 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trickle progress */}
                {strategyType === "trickle" && trInfo && (e.status === "open" || e.status === "active") && (
                  <TrickleProgress
                    startTime={trInfo.startTime}
                    duration={trInfo.duration}
                    amount={parseFloat(e.amount)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-xs text-weavrn-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TrickleProgress({ startTime, duration, amount }: { startTime: number; duration: number; amount: number }) {
  const [now, setNow] = useState(Date.now() / 1000);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.max(0, now - startTime);
  const progress = Math.min(elapsed / duration, 1);
  const vested = amount * progress;
  const remaining = Math.max(0, startTime + duration - now);
  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  return (
    <div className="mt-2 pt-2 border-t border-weavrn-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-weavrn-muted">
          Streaming: {vested.toFixed(4)} / {amount.toFixed(4)} vested
        </span>
        <span className="text-xs text-weavrn-muted">
          {remaining > 0 ? `${hours}h ${mins}m remaining` : "Fully vested"}
        </span>
      </div>
      <div className="h-1.5 bg-weavrn-border rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
