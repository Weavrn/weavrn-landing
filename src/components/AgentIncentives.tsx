"use client";

import { useState } from "react";
import { JsonRpcSigner } from "ethers";
import { claimFirstUseBonus, claimRebateOnChain, getExplorerTxUrl } from "@/lib/contracts";
import type { IncentiveClaim } from "@/lib/api";

interface Props {
  signer: JsonRpcSigner | null;
  walletAddress: string;
  hasClaimedFirstUse: boolean;
  paymentCount: number;
  incentives: IncentiveClaim[];
  onClaimed: () => void;
}

export default function AgentIncentives({
  signer,
  hasClaimedFirstUse,
  paymentCount,
  incentives,
  onClaimed,
}: Props) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClaimBonus = async () => {
    if (!signer) return;
    setClaiming("bonus");
    setError(null);
    try {
      const hash = await claimFirstUseBonus(signer);
      setTxHash(hash);
      onClaimed();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Claim failed");
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimRebate = async (rebateId: number) => {
    if (!signer) return;
    setClaiming(`rebate-${rebateId}`);
    setError(null);
    try {
      const hash = await claimRebateOnChain(signer, rebateId);
      setTxHash(hash);
      onClaimed();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Claim failed");
    } finally {
      setClaiming(null);
    }
  };

  const pendingRebates = incentives.filter(
    (i) => i.claim_type === "rebate" && !i.tx_hash,
  );

  const canClaimBonus = !hasClaimedFirstUse && paymentCount > 0;

  if (!canClaimBonus && pendingRebates.length === 0) return null;

  return (
    <div className="glow-card rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Incentives</h2>

      {canClaimBonus && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-weavrn-dark border border-weavrn-border">
          <div>
            <p className="text-sm font-medium">First-Use Bonus</p>
            <p className="text-xs text-weavrn-muted">100 WVRN for making your first payment</p>
          </div>
          <button
            onClick={handleClaimBonus}
            disabled={claiming === "bonus" || !signer}
            className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {claiming === "bonus" ? "Claiming..." : "Claim"}
          </button>
        </div>
      )}

      {pendingRebates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium mb-2">Pending Rebates</p>
          {pendingRebates.map((rebate) => (
            <div
              key={rebate.id}
              className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
            >
              <div>
                <p className="text-sm font-mono">{parseFloat(rebate.amount).toFixed(2)} WVRN</p>
                <p className="text-xs text-weavrn-muted">
                  {new Date(rebate.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleClaimRebate(rebate.rebate_id!)}
                disabled={claiming === `rebate-${rebate.rebate_id}` || !signer}
                className="px-3 py-1.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {claiming === `rebate-${rebate.rebate_id}` ? "..." : "Claim"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {txHash && (
        <p className="mt-3 text-xs text-weavrn-accent">
          Claimed!{" "}
          <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="underline">
            View tx
          </a>
        </p>
      )}
    </div>
  );
}
