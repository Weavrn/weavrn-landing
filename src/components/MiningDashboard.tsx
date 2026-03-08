"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import {
  getRewards,
  getProfile,
  refreshPosts,
  startVerification,
  verifyHandle,
  unlinkHandle,
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

function formatCountdown(endTimestamp: number): string {
  const remaining = endTimestamp - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Closing...";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MiningDashboard({
  walletAddress,
  signer,
}: MiningDashboardProps) {
  const [xHandle, setXHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationHandle, setVerificationHandle] = useState<string | null>(null);
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [rewards, profile] = await Promise.all([
        getRewards(walletAddress),
        getProfile(walletAddress),
      ]);
      setData(rewards);
      if (profile.x_handle) {
        setXHandle(profile.x_handle);
        setVerificationCode(null);
        setVerificationHandle(null);
      } else if (profile.verification_code && profile.verification_handle) {
        const expired = profile.verification_expires_at
          && new Date(profile.verification_expires_at) < new Date();
        if (!expired) {
          setVerificationCode(profile.verification_code);
          setVerificationHandle(profile.verification_handle);
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data?.current_block) return;
    const update = () => {
      const remaining = data.current_block.end_time - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        setCountdown("Closing...");
        fetchData();
        return;
      }
      setCountdown(formatCountdown(data.current_block.end_time));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [data?.current_block, fetchData]);

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleInput.replace(/^@/, "").trim();
    if (!cleaned) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!signer) { setError("Wallet not connected"); return; }
      const res = await startVerification(signer, walletAddress, cleaned);
      setVerificationCode(res.code);
      setVerificationHandle(cleaned);
      setHandleInput("");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      if (!signer) { setError("Wallet not connected"); return; }
      const profile = await verifyHandle(signer, walletAddress);
      setXHandle(profile.x_handle);
      setVerificationCode(null);
      setVerificationHandle(null);
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlink = async () => {
    setError(null);
    try {
      if (!signer) { setError("Wallet not connected"); return; }
      await unlinkHandle(signer, walletAddress);
      setXHandle(null);
      setVerificationCode(null);
      setVerificationHandle(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshPosts(walletAddress);
      await fetchData();
      setRefreshCooldown(300);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      const match = msg.match(/Try again in (\d+)s/);
      if (match) setRefreshCooldown(parseInt(match[1]));
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (refreshCooldown <= 0) return;
    const interval = setInterval(() => {
      setRefreshCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshCooldown]);

  const handleCancelVerification = () => {
    setVerificationCode(null);
    setVerificationHandle(null);
    setError(null);
  };

  const handleCopy = async () => {
    if (!verificationCode) return;
    await navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async (sub: Submission) => {
    if (!signer || sub.on_chain_id == null) return;
    setClaimingId(sub.id);
    setError(null);
    try {
      const txHash = await claimReward(signer, sub.on_chain_id);
      await markClaimed(signer, walletAddress, sub.on_chain_id, txHash).catch(() => {});
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

  // State A: No handle, no pending verification — show handle input
  if (!xHandle && !verificationCode) {
    return (
      <div className="max-w-md mx-auto">
        <div className="glow-card rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-2">
            Link your X account
          </h3>
          <p className="text-sm text-weavrn-muted mb-6">
            Verify ownership of your X account to start earning.
            We&apos;ll ask you to add a short code to your bio.
          </p>
          <form onSubmit={handleStartVerification} className="flex gap-2">
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder="@yourhandle"
              className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {submitting ? "..." : "Continue"}
            </button>
          </form>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // State B: Pending verification — show code and verify button
  if (!xHandle && verificationCode) {
    return (
      <div className="max-w-md mx-auto">
        <div className="glow-card rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-2">
            Verify @{verificationHandle}
          </h3>
          <p className="text-sm text-weavrn-muted mb-4">
            Add this code to your X bio, then click Verify.
            You can remove it after verification.
          </p>

          <div className="flex items-center gap-2 mb-6 p-3 bg-weavrn-dark rounded-lg border border-weavrn-border">
            <code className="flex-1 text-[#00D4AA] font-mono text-lg font-bold tracking-wider">
              {verificationCode}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs text-weavrn-muted hover:text-white border border-weavrn-border rounded transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex-1 px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Verify"}
            </button>
            <button
              onClick={handleCancelVerification}
              className="px-4 py-2.5 text-sm text-weavrn-muted hover:text-white border border-weavrn-border rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // State C: Verified — main dashboard
  const trackedPosts = data?.tracked_posts ?? [];
  const blockRewards = data?.block_rewards ?? [];
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
            {trackedPosts.length}
          </div>
          <div className="text-xs text-weavrn-muted font-mono mt-1">
            Tracked Posts
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

      {/* Current block banner */}
      {data?.current_block && (
        <div className="glow-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                Block {data.current_block.number}
              </h3>
              <p className="text-sm text-weavrn-muted mt-1">
                @{xHandle}
                <button
                  onClick={handleUnlink}
                  className="ml-2 text-xs text-weavrn-muted/50 hover:text-red-400 transition-colors"
                >
                  change
                </button>
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold gradient-text">{countdown}</div>
              <div className="text-xs text-weavrn-muted font-mono mt-0.5">
                until close
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracked Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Tracked Posts</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing || refreshCooldown > 0}
            className="px-3 py-1.5 text-xs font-mono border border-weavrn-border rounded-lg hover:border-[#00D4AA]/50 hover:text-[#00D4AA] text-weavrn-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {refreshing
              ? "Scanning..."
              : refreshCooldown > 0
                ? `${Math.floor(refreshCooldown / 60)}:${String(refreshCooldown % 60).padStart(2, "0")}`
                : "Refresh"}
          </button>
        </div>
        {trackedPosts.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No posts discovered yet. Post about Weavrn on X and they&apos;ll
            appear here automatically.
          </div>
        ) : (
          <div className="space-y-2">
            {trackedPosts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm"
              >
                <div className="flex-1 truncate mr-4">
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00D4AA] hover:text-[#00F0C0] transition-colors font-mono text-xs"
                  >
                    {p.post_url}
                  </a>
                  {p.text && (
                    <p className="text-xs text-weavrn-muted mt-1 truncate">
                      {p.text}
                    </p>
                  )}
                </div>
                <div className="text-xs text-weavrn-muted font-mono flex-shrink-0">
                  Block {p.discovered_in_block}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block History */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Block Rewards</h3>
        {blockRewards.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No block rewards yet. Rewards are calculated when each block closes.
          </div>
        ) : (
          <div className="space-y-2">
            {blockRewards.map((br) => {
              const sub = submissions.find((s) => s.id === br.submission_id);
              return (
                <div
                  key={br.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-white font-mono text-xs">
                      Block {br.block_number}
                    </span>
                    <span className="text-weavrn-muted font-mono text-xs">
                      {br.post_count} post{br.post_count !== 1 ? "s" : ""} — score{" "}
                      {br.delta_score}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sub?.reward_amount != null && (
                      <span className="text-weavrn-muted font-mono text-xs">
                        {parseFloat(sub.reward_amount).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        WVRN
                      </span>
                    )}
                    {sub?.tx_hash && (
                      <a
                        href={getExplorerTxUrl(sub.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-weavrn-muted/50 hover:text-weavrn-muted font-mono text-[10px]"
                      >
                        tx
                      </a>
                    )}
                    {sub &&
                      sub.status === "approved" &&
                      sub.on_chain_id != null &&
                      signer && (
                        <button
                          onClick={() => handleClaim(sub)}
                          disabled={claimingId === sub.id}
                          className="px-3 py-1 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                        >
                          {claimingId === sub.id ? "Claiming..." : "Claim"}
                        </button>
                      )}
                    {sub && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                          STATUS_STYLES[sub.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {sub.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
