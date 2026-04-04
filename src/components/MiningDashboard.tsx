"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { JsonRpcSigner } from "ethers";

import {
  startVerification,
  verifyHandle,
  unlinkHandle,
} from "@/lib/api";
import { features } from "@/lib/features";

import { useMiningData } from "@/hooks/useMiningData";

import EarningsChart from "./EarningsChart";
import YouTubeVerification from "./YouTubeVerification";
import MiningRules from "./MiningRules";
import StatsGrid from "./mining/StatsGrid";
import PoolCards from "./mining/PoolCards";
import BlockBanner from "./mining/BlockBanner";
import LinkedAccounts from "./mining/LinkedAccounts";
import BlockRewardsSection from "./mining/BlockRewardsSection";
import TrackedPostsSection from "./mining/TrackedPostsSection";

interface MiningDashboardProps {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

export default function MiningDashboard({
  walletAddress,
  signer,
}: MiningDashboardProps) {
  // --- Data from hook (stable slices) ---
  const {
    currentBlock,
    blockRewards,
    trackedPosts,
    submissions,
    walletSummary,
    profile,
    miningStats,
    historyRefreshKey,
    isInitialLoad,
    error,
    setError,
    refreshData,
  } = useMiningData(walletAddress);

  // --- Verification flow state (only used in States A/B early returns) ---
  const [xHandle, setXHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationHandle, setVerificationHandle] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Derive verification state from profile slice ---
  useEffect(() => {
    if (!profile) return;
    if (profile.x_handle) {
      setXHandle((prev) => (prev === profile.x_handle ? prev : profile.x_handle));
      setVerificationCode(null);
      setVerificationHandle(null);
    } else if (profile.verification_code && profile.verification_handle) {
      const expired =
        profile.verification_expires_at &&
        new Date(profile.verification_expires_at) < new Date();
      if (!expired) {
        setVerificationCode((prev) =>
          prev === profile.verification_code ? prev : profile.verification_code,
        );
        setVerificationHandle((prev) =>
          prev === profile.verification_handle ? prev : profile.verification_handle,
        );
      }
    }
  }, [profile]);

  const unclaimedAmount = walletSummary?.unclaimed_wvrn ?? 0;

  // --- Verification handlers ---
  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleInput.replace(/^@/, "").trim();
    if (!cleaned) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
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
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
      const p = await verifyHandle(signer, walletAddress);
      setXHandle(p.x_handle);
      setVerificationCode(null);
      setVerificationHandle(null);
      await refreshData();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlink = useCallback(async () => {
    setError(null);
    try {
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
      await unlinkHandle(signer, walletAddress);
      setXHandle(null);
      setVerificationCode(null);
      setVerificationHandle(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }, [signer, walletAddress, setError]);

  const handleUnlinkYT = useCallback(async () => {
    setError(null);
    try {
      if (!signer) { setError("Wallet not connected"); return; }
      const { unlinkYouTubeHandle } = await import("@/lib/api");
      await unlinkYouTubeHandle(signer, walletAddress);
      refreshData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }, [signer, walletAddress, setError, refreshData]);

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

  // --- Initial load ---
  if (isInitialLoad) {
    return (
      <div className="text-center py-20 text-weavrn-muted text-sm">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => { setError(null); refreshData(); }}
              className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          "Loading..."
        )}
      </div>
    );
  }

  // --- State A: No handle linked, no pending verification ---
  const hasAnyHandle = xHandle || (features.youtube && profile?.yt_handle);
  if (!hasAnyHandle && !verificationCode) {
    return (
      <div className="max-w-md mx-auto space-y-6">
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
        {features.youtube && (
          <YouTubeVerification
            walletAddress={walletAddress}
            signer={signer}
            ytHandle={profile?.yt_handle ?? null}
            ytVerificationCode={profile?.yt_verification_code ?? null}
            ytVerificationHandle={profile?.yt_verification_handle ?? null}
            onUpdate={refreshData}
          />
        )}
      </div>
    );
  }

  // --- State B: Pending X verification ---
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

  // --- State C: Verified — main dashboard ---
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

      <StatsGrid
        postCount={trackedPosts.length}
        totalEarned={walletSummary?.total_earned || "0"}
        unclaimedAmount={unclaimedAmount}
        balance={walletSummary?.balance || "0"}
      />

      {miningStats?.pools && (
        <PoolCards
          pools={miningStats.pools}
          currentEmission={miningStats.current_emission}
          showYouTube={features.youtube}
        />
      )}

      {currentBlock && (
        <BlockBanner
          currentBlock={currentBlock}
          onBlockClose={refreshData}
        />
      )}

      <LinkedAccounts
        xHandle={xHandle}
        ytHandle={profile?.yt_handle ?? null}
        onUnlinkX={handleUnlink}
        onUnlinkYT={handleUnlinkYT}
      />

      <MiningRules
        followerCount={profile?.x_follower_count}
        subscriberCount={profile?.yt_subscriber_count}
        rules={miningStats?.rules}
      />

      <BlockRewardsSection
        blockRewards={blockRewards}
        submissions={submissions}
        signer={signer}
        walletAddress={walletAddress}
        totalUnclaimedWvrn={unclaimedAmount}
        onDataRefresh={refreshData}
      />

      <TrackedPostsSection
        trackedPosts={trackedPosts}
        walletAddress={walletAddress}
        onDataRefresh={refreshData}
      />

      {blockRewards.length > 0 && (
        <EarningsChart
          walletAddress={walletAddress}
          historyRefreshKey={historyRefreshKey}
        />
      )}

      {features.youtube && xHandle && !profile?.yt_handle && (
        <YouTubeVerification
          walletAddress={walletAddress}
          signer={signer}
          ytHandle={null}
          ytVerificationCode={profile?.yt_verification_code ?? null}
          ytVerificationHandle={profile?.yt_verification_handle ?? null}
          onUpdate={refreshData}
        />
      )}

      {hasAnyHandle && (
        <div className="glow-card rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-3">Join the Community</h4>
          <p className="text-xs text-weavrn-muted mb-4">Connect with other miners, get support, and stay updated on new features.</p>
          <div className="flex gap-3">
            <a
              href="https://t.me/+tJgAQDo46bA4MDkx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-center transition-all bg-[#229ED9]/10 text-[#229ED9] border border-[#229ED9]/20 hover:bg-[#229ED9]/20"
            >
              Telegram
            </a>
            <a
              href="https://discord.gg/VgUHVuCW4D"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-center transition-all bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20 hover:bg-[#5865F2]/20"
            >
              Discord
            </a>
          </div>
        </div>
      )}

      {hasAnyHandle && (
        <div className="border border-weavrn-border/30 rounded-xl p-5 text-xs text-weavrn-muted/70 space-y-3">
          <h4 className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Social Mining Rules</h4>
          <div className="space-y-2 leading-relaxed">
            <p><span className="text-weavrn-muted">Eligibility.</span> Your X account must have at least 50 followers. Posts must mention weavrn, $WVRN, #WVRN, @weavrn, weavrn.com, or weavrn.ai to qualify. Only posts created after you link your account are eligible.</p>
            <p><span className="text-weavrn-muted">Scoring.</span> Engagement score = (likes &times; 1) + (retweets &times; 3) + (replies &times; 2) + (views &times; 0.01). Effective score uses diminishing returns: sqrt(score) &times; 100. Posts must reach a minimum engagement score of 10 to qualify.</p>
            <p><span className="text-weavrn-muted">Rewards.</span> Block emission is divided proportionally by effective score. No single user can earn more than 50% of a block&apos;s emission. A maximum of 10 qualifying posts per user are counted per block.</p>
            <p><span className="text-weavrn-muted">Anti-gaming.</span> Duplicate content is detected and flagged — only the original post earns rewards. A velocity cap limits sudden engagement spikes: deltas are capped at 10&times; the rolling average of your last 5 blocks. First-block deltas are capped at 500. Deleted posts stop earning immediately.</p>
            <p><span className="text-weavrn-muted">Claims.</span> Rewards are committed on-chain via merkle roots. You can claim earned WVRN at any time by submitting a merkle proof to the MerkleRewards contract. Unclaimed rewards do not expire.</p>
          </div>
        </div>
      )}
    </div>
  );
}
