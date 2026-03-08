"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import {
  getRewards,
  linkXHandle,
  submitPost,
  markClaimed,
  type Submission,
  type RewardsResponse,
} from "@/lib/api";
import {
  claimReward,
  addTokenToWallet,
  getExplorerTxUrl,
} from "@/lib/contracts";

interface MiningDashboardProps {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/20",
  claimed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function MiningDashboard({
  walletAddress,
  signer,
}: MiningDashboardProps) {
  const [xHandle, setXHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `weavrn_xhandle_${walletAddress.toLowerCase()}`;

  const fetchData = useCallback(async () => {
    try {
      const res = await getRewards(walletAddress);
      setData(res);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setXHandle(saved);
    fetchData();
  }, [walletAddress, storageKey, fetchData]);

  const handleLinkX = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleInput.replace(/^@/, "").trim();
    if (!cleaned) return;
    setLinking(true);
    setError(null);
    try {
      await linkXHandle(walletAddress, cleaned);
      setXHandle(cleaned);
      localStorage.setItem(storageKey, cleaned);
      setHandleInput("");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLinking(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPost(walletAddress, postUrl.trim());
      setPostUrl("");
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (sub: Submission) => {
    if (!signer || sub.on_chain_id == null) return;
    setClaimingId(sub.id);
    setError(null);
    try {
      const txHash = await claimReward(signer, sub.on_chain_id);
      await markClaimed(sub.on_chain_id, txHash).catch(() => {});
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-weavrn-muted text-sm">
        Loading...
      </div>
    );
  }

  if (!xHandle) {
    return (
      <div className="max-w-md mx-auto">
        <div className="glow-card rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-2">
            Link your X account
          </h3>
          <p className="text-sm text-weavrn-muted mb-6">
            Connect your X handle to start submitting content.
          </p>
          <form onSubmit={handleLinkX} className="flex gap-2">
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder="@yourhandle"
              className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              disabled={linking}
              className="px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {linking ? "..." : "Link"}
            </button>
          </form>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  const submissions = data?.submissions ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400/60 hover:text-red-400"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glow-card rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white">
            {submissions.length}
          </div>
          <div className="text-xs text-weavrn-muted font-mono mt-1">
            Submissions
          </div>
        </div>
        <div className="glow-card rounded-xl p-5 text-center">
          <div className="text-2xl font-bold gradient-text">
            {parseFloat(data?.total_earned || "0").toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-weavrn-muted font-mono mt-1">
            WVRN Earned
          </div>
        </div>
        <div className="glow-card rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-white">
            {parseFloat(data?.balance || "0").toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-weavrn-muted font-mono mt-1">
            Balance
            <button
              onClick={addTokenToWallet}
              className="ml-1.5 text-[#00D4AA]/60 hover:text-[#00D4AA] transition-colors"
              title="Add WVRN to wallet"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Submit post */}
      <div className="glow-card rounded-2xl p-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white">Submit a Post</h3>
          <span className="text-xs text-weavrn-muted font-mono">
            @{xHandle}
          </span>
        </div>
        <p className="text-sm text-weavrn-muted mb-5">
          Share content about AI agents, DeFi, or Weavrn on X and paste the URL
          below. Max 3 per day.
        </p>
        <form onSubmit={handleSubmitPost} className="flex gap-2">
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://x.com/yourhandle/status/..."
            required
            className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors font-mono text-xs placeholder:text-weavrn-muted/50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? "..." : "Submit"}
          </button>
        </form>
      </div>

      {/* Submissions list */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Your Submissions</h3>
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No submissions yet. Share something on X to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm"
              >
                <div className="flex-1 truncate mr-4">
                  <a
                    href={s.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00D4AA] hover:text-[#00F0C0] transition-colors font-mono text-xs"
                  >
                    {s.post_url}
                  </a>
                  {s.tx_hash && (
                    <a
                      href={getExplorerTxUrl(s.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-weavrn-muted/50 hover:text-weavrn-muted font-mono text-[10px]"
                    >
                      tx
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.reward_amount != null && (
                    <span className="text-weavrn-muted font-mono text-xs">
                      {parseFloat(s.reward_amount).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      WVRN
                    </span>
                  )}
                  {s.status === "approved" &&
                    s.on_chain_id != null &&
                    signer && (
                      <button
                        onClick={() => handleClaim(s)}
                        disabled={claimingId === s.id}
                        className="px-3 py-1 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {claimingId === s.id ? "Claiming..." : "Claim"}
                      </button>
                    )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                      STATUS_STYLES[s.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
