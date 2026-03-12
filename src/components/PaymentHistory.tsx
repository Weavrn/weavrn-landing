"use client";

import { useState } from "react";
import { getExplorerTxUrl } from "@/lib/contracts";
import type { PaymentRecord } from "@/lib/api";

interface Props {
  payments: PaymentRecord[];
  total: number;
  page: number;
  walletAddress: string;
  onPageChange: (page: number) => void;
}

type Tab = "all" | "sent" | "received";

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function PaymentHistory({ payments, total, page, walletAddress, onPageChange }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const wallet = walletAddress.toLowerCase();

  const filtered = payments.filter((p) => {
    if (tab === "sent") return p.from_address === wallet;
    if (tab === "received") return p.to_address === wallet;
    return true;
  });

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Payment History</h2>
        <div className="flex gap-1">
          {(["all", "sent", "received"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-weavrn-accent/10 text-weavrn-accent border border-weavrn-accent/30"
                  : "text-weavrn-muted hover:text-white border border-transparent"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-weavrn-muted py-4 text-center">No payments found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const isSent = p.from_address === wallet;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isSent ? "bg-red-500/10 text-red-400" : "bg-weavrn-accent/10 text-weavrn-accent"}`}>
                    {isSent ? "Sent" : "Recv"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate">
                      {isSent ? truncAddr(p.to_address) : truncAddr(p.from_address)}
                    </p>
                    {p.memo && (
                      <p className="text-xs text-weavrn-muted truncate max-w-[200px]">{p.memo}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono">
                    {parseFloat(p.amount).toFixed(4)} {p.token_address ? "ERC20" : "ETH"}
                  </p>
                  <a
                    href={getExplorerTxUrl(p.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-weavrn-muted hover:text-weavrn-accent"
                  >
                    {p.tx_hash.slice(0, 10)}...
                  </a>
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
