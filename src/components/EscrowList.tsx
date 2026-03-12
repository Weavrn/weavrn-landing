"use client";

import { useState } from "react";
import { JsonRpcSigner } from "ethers";
import { releaseEscrow, claimStream, refundEscrow, getExplorerTxUrl } from "@/lib/contracts";
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
  const wallet = walletAddress.toLowerCase();
  const totalPages = Math.ceil(total / 50);

  const handleRelease = async (escrowId: number) => {
    if (!signer) return;
    setActing(escrowId);
    setError(null);
    try {
      await releaseEscrow(signer, escrowId);
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

            return (
              <div
                key={e.id}
                className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[e.status]}`}>
                    {e.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-mono">
                      {isSender ? `To ${truncAddr(e.recipient)}` : `From ${truncAddr(e.sender)}`}
                    </p>
                    <p className="text-xs text-weavrn-muted">
                      Deadline: {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString()}
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
                      {isSender && (
                        <button
                          onClick={() => handleRelease(e.escrow_id)}
                          disabled={acting === e.escrow_id}
                          className="px-2 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-xs font-semibold disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                      {!isSender && e.status === "active" && (
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
