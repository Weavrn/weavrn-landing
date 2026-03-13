"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { JsonRpcSigner } from "ethers";

const fmtWvrn = (n: number) => Number(n.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  batchClaimRewards,
  addTokenToWallet,
  getExplorerTxUrl,
} from "@/lib/contracts";

interface MiningDashboardProps {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-weavrn-accent/10 text-weavrn-accent border-weavrn-accent/20",
  claimed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

type RewardFilter = "claimable" | "all";
type PostFilter = "active" | "all";
type PostSort = "newest" | "oldest" | "earned";

function formatCountdown(endTimestamp: number): string {
  const remaining = endTimestamp - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Closing...";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function FilterTab<T extends string>({
  value,
  current,
  label,
  count,
  onClick,
}: {
  value: T;
  current: T;
  label: string;
  count?: number;
  onClick: (v: T) => void;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
        active
          ? "bg-weavrn-surface text-white border border-weavrn-border"
          : "text-weavrn-muted hover:text-white"
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className={`ml-1.5 ${active ? "text-weavrn-accent" : "text-weavrn-muted/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
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
  const [claimingAll, setClaimingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("claimable");
  const [postFilter, setPostFilter] = useState<PostFilter>("active");
  const [postSort, setPostSort] = useState<PostSort>("newest");

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
      await markClaimed(signer, walletAddress, sub.on_chain_id, txHash).catch(() => {
        setError("Claimed on-chain but failed to update dashboard. Please refresh.");
      });
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setClaimingId(null);
    }
  };

  // Derived data
  const submissions = data?.submissions ?? [];
  const blockRewards = data?.block_rewards ?? [];
  const trackedPosts = data?.tracked_posts ?? [];

  const claimableSubs = useMemo(
    () => submissions.filter((s) => s.status === "approved" && s.on_chain_id != null),
    [submissions],
  );

  const unclaimedAmount = useMemo(
    () => claimableSubs.reduce((sum, s) => sum + parseFloat(s.reward_amount || "0"), 0),
    [claimableSubs],
  );

  const filteredRewards = useMemo(() => {
    if (rewardFilter === "claimable") {
      return blockRewards.filter((br) => {
        const sub = submissions.find((s) => s.id === br.submission_id);
        return sub?.status !== "claimed";
      });
    }
    return blockRewards;
  }, [blockRewards, submissions, rewardFilter]);

  const claimedCount = useMemo(
    () => blockRewards.filter((br) => {
      const sub = submissions.find((s) => s.id === br.submission_id);
      return sub?.status === "claimed";
    }).length,
    [blockRewards, submissions],
  );

  const filteredPosts = useMemo(() => {
    let posts = trackedPosts;
    if (postFilter === "active") {
      posts = posts.filter((p) => !p.deleted_at);
    }
    if (postSort === "oldest") {
      return [...posts].reverse();
    }
    if (postSort === "earned") {
      return [...posts].sort((a, b) => b.estimated_wvrn - a.estimated_wvrn);
    }
    return posts;
  }, [trackedPosts, postFilter, postSort]);

  const deletedCount = trackedPosts.filter((p) => p.deleted_at).length;

  const handleClaimAll = async () => {
    if (!signer || claimableSubs.length === 0) return;
    setClaimingAll(true);
    setError(null);
    try {
      const onChainIds = claimableSubs.map((s) => s.on_chain_id!);
      const txHash = await batchClaimRewards(signer, onChainIds);
      for (const sub of claimableSubs) {
        await markClaimed(signer, walletAddress, sub.on_chain_id!, txHash).catch(() => {
          setError("Claimed on-chain but failed to update dashboard. Please refresh.");
        });
      }
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setClaimingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-weavrn-muted text-sm">
        Loading...
      </div>
    );
  }

  // State A: No handle, no pending verification
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
              className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {submitting ? "..." : "Continue"}
            </button>
          </form>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // State B: Pending verification
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
            <code className="flex-1 text-weavrn-accent font-mono text-lg font-bold tracking-wider">
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
              className="flex-1 px-6 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glow-card rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-white">
            {trackedPosts.length}
          </div>
          <div className="text-[10px] text-weavrn-muted font-mono mt-1">
            Tracked Posts
          </div>
        </div>
        <div className="glow-card rounded-xl p-4 text-center">
          <div className="text-xl font-bold gradient-text">
            {Math.floor(parseFloat(data?.total_earned || "0")).toLocaleString()}
          </div>
          <div className="text-[10px] text-weavrn-muted font-mono mt-1">
            Total Earned
          </div>
        </div>
        <div className="glow-card rounded-xl p-4 text-center">
          <div className={`text-xl font-bold ${unclaimedAmount > 0 ? "text-weavrn-accent" : "text-white"}`}>
            {Math.floor(unclaimedAmount).toLocaleString()}
          </div>
          <div className="text-[10px] text-weavrn-muted font-mono mt-1">
            Unclaimed
          </div>
        </div>
        <div className="glow-card rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-white">
            {parseFloat(data?.balance || "0").toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-[10px] text-weavrn-muted font-mono mt-1">
            Balance
            <button
              onClick={addTokenToWallet}
              className="ml-1 text-weavrn-accent/60 hover:text-weavrn-accent transition-colors"
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

      {/* Block Rewards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">Block Rewards</h3>
            <div className="flex items-center gap-1">
              <FilterTab
                value="claimable"
                current={rewardFilter}
                label="Unclaimed"
                count={blockRewards.length - claimedCount}
                onClick={setRewardFilter}
              />
              <FilterTab
                value="all"
                current={rewardFilter}
                label="All"
                count={blockRewards.length}
                onClick={setRewardFilter}
              />
            </div>
          </div>
          {claimableSubs.length > 1 && signer && (
            <button
              onClick={handleClaimAll}
              disabled={claimingAll || claimingId != null}
              className="px-4 py-1.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            >
              {claimingAll
                ? "Claiming..."
                : `Claim All (${fmtWvrn(unclaimedAmount)} WVRN)`}
            </button>
          )}
        </div>
        {blockRewards.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No block rewards yet. Rewards are calculated when each block closes.
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="text-center py-8 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            All rewards claimed. Switch to &quot;All&quot; to view history.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRewards.map((br) => {
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
                      {br.post_count} post{br.post_count !== 1 ? "s" : ""} &mdash; score{" "}
                      {br.delta_score}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sub?.reward_amount != null && (
                      <span className="text-weavrn-muted font-mono text-xs">
                        {fmtWvrn(parseFloat(sub.reward_amount))} WVRN
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
                          disabled={claimingId === sub.id || claimingAll}
                          className="px-3 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
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

      {/* Tracked Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">Tracked Posts</h3>
            <div className="flex items-center gap-1">
              <FilterTab
                value="active"
                current={postFilter}
                label="Active"
                count={trackedPosts.length - deletedCount}
                onClick={setPostFilter}
              />
              {deletedCount > 0 && (
                <FilterTab
                  value="all"
                  current={postFilter}
                  label="All"
                  count={trackedPosts.length}
                  onClick={setPostFilter}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={postSort}
              onChange={(e) => setPostSort(e.target.value as PostSort)}
              className="px-2 py-1 text-xs font-mono bg-transparent border border-weavrn-border rounded-lg text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="earned">Top Earned</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing || refreshCooldown > 0}
              className="px-3 py-1.5 text-xs font-mono border border-weavrn-border rounded-lg hover:border-weavrn-accent/50 hover:text-weavrn-accent text-weavrn-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {refreshing
                ? "Scanning..."
                : refreshCooldown > 0
                  ? `${Math.floor(refreshCooldown / 60)}:${String(refreshCooldown % 60).padStart(2, "0")}`
                  : "Refresh"}
            </button>
          </div>
        </div>
        {trackedPosts.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No posts discovered yet. Post about Weavrn on X and they&apos;ll
            appear here automatically.
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-8 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No active posts. Switch to &quot;All&quot; to view deleted posts.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((p) => {
              const isExpanded = expandedPostId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border bg-weavrn-surface/30 text-sm ${
                    p.deleted_at
                      ? "border-red-500/20 opacity-60"
                      : "border-weavrn-border/50"
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-weavrn-surface/50 transition-colors rounded-xl"
                    onClick={() => setExpandedPostId(isExpanded ? null : p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <svg
                          className={`w-3 h-3 text-weavrn-muted flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          {p.text ? (
                            <p className="text-sm text-white/90 leading-snug line-clamp-2">
                              {p.text}
                            </p>
                          ) : (
                            <a
                              href={p.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-weavrn-accent hover:text-weavrn-accent-hover transition-colors font-mono text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {p.post_url}
                            </a>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {p.text && (
                              <a
                                href={p.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-weavrn-accent/60 hover:text-weavrn-accent transition-colors font-mono text-[10px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                view post
                              </a>
                            )}
                            {p.deleted_at && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                                deleted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {p.estimated_wvrn > 0 && (
                          <span className="text-xs font-mono text-weavrn-accent font-medium">
                            {fmtWvrn(p.estimated_wvrn)} WVRN
                          </span>
                        )}
                        <span className="text-[10px] text-weavrn-muted font-mono">
                          Block {p.discovered_in_block}
                        </span>
                      </div>
                    </div>
                    {p.raw_score != null && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-weavrn-border/30">
                        <span className="text-[11px] text-weavrn-muted font-mono">
                          {p.likes ?? 0} likes
                        </span>
                        <span className="text-[11px] text-weavrn-muted font-mono">
                          {p.retweets ?? 0} RTs
                        </span>
                        <span className="text-[11px] text-weavrn-muted font-mono">
                          {p.replies ?? 0} replies
                        </span>
                        <span className="text-[11px] text-weavrn-muted font-mono">
                          {(p.views ?? 0).toLocaleString()} views
                        </span>
                        <span className="ml-auto text-[11px] font-mono text-weavrn-muted">
                          score {p.raw_score}
                        </span>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-weavrn-border/30 pt-3">
                        {p.block_history.length === 0 ? (
                          <p className="text-xs text-weavrn-muted text-center py-3">
                            No block history yet
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] font-mono">
                              <thead>
                                <tr className="text-weavrn-muted border-b border-weavrn-border/20">
                                  <th className="text-left py-1.5 pr-3">Block</th>
                                  <th className="text-right py-1.5 px-2">Likes</th>
                                  <th className="text-right py-1.5 px-2">RTs</th>
                                  <th className="text-right py-1.5 px-2">Replies</th>
                                  <th className="text-right py-1.5 px-2">Views</th>
                                  <th className="text-right py-1.5 px-2">Score</th>
                                  <th className="text-right py-1.5 px-2">Delta</th>
                                  <th className="text-right py-1.5 pl-2">WVRN</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.block_history.map((b) => (
                                  <tr key={b.block_number} className="text-weavrn-muted/80 border-b border-weavrn-border/10">
                                    <td className="py-1.5 pr-3 text-white">{b.block_number}</td>
                                    <td className="text-right py-1.5 px-2">{b.likes}</td>
                                    <td className="text-right py-1.5 px-2">{b.retweets}</td>
                                    <td className="text-right py-1.5 px-2">{b.replies}</td>
                                    <td className="text-right py-1.5 px-2">{b.views.toLocaleString()}</td>
                                    <td className="text-right py-1.5 px-2">{b.raw_score}</td>
                                    <td className="text-right py-1.5 px-2">{b.delta}</td>
                                    <td className="text-right py-1.5 pl-2 text-weavrn-accent">
                                      {fmtWvrn(b.earned)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-weavrn-border/30 text-white font-medium">
                                  <td className="py-1.5 pr-3" colSpan={7}>Total</td>
                                  <td className="text-right py-1.5 pl-2 text-weavrn-accent">
                                    {fmtWvrn(p.estimated_wvrn)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
