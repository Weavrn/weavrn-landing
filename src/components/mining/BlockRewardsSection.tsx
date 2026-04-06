"use client";

import { memo, useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { JsonRpcSigner } from "ethers";
import {
  getRewards,
  markClaimed,
  getMerkleProof,
  type Submission,
  type BlockReward,
  type Pagination,
} from "@/lib/api";
import {
  claimReward,
  batchClaimRewards,
  claimMerkleReward,
  batchClaimMerkleRewards,
  getExplorerTxUrl,
} from "@/lib/contracts";

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-weavrn-accent/10 text-weavrn-accent border-weavrn-accent/20",
  claimed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

type RewardFilter = "all" | "unclaimed";

function FilterTab({
  value,
  current,
  label,
  count,
  onClick,
}: {
  value: RewardFilter;
  current: RewardFilter;
  label: string;
  count?: number;
  onClick: (v: RewardFilter) => void;
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
      {count != null && (
        <span
          className={`ml-1.5 ${active ? "text-weavrn-accent" : "text-weavrn-muted/50"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface BlockRewardsSectionProps {
  blockRewards: BlockReward[];
  submissions: Submission[];
  signer: JsonRpcSigner | null;
  walletAddress: string;
  totalUnclaimedWvrn: number;
  onDataRefresh: () => Promise<void>;
}

const REWARDS_PER_PAGE = 10;

const BlockRewardsSection = memo(function BlockRewardsSection({
  blockRewards: initialBlockRewards,
  submissions,
  signer,
  walletAddress,
  totalUnclaimedWvrn,
  onDataRefresh,
}: BlockRewardsSectionProps) {
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("unclaimed");
  const [rewardsPage, setRewardsPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [blockRewards, setBlockRewards] = useState<BlockReward[]>(initialBlockRewards);
  const [totalAll, setTotalAll] = useState<number | null>(null);
  const [totalUnclaimed, setTotalUnclaimed] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageRef = useRef(rewardsPage);
  const filterRef = useRef(rewardFilter);
  pageRef.current = rewardsPage;
  filterRef.current = rewardFilter;

  // Sync initial data from parent on first load
  useEffect(() => {
    setBlockRewards(initialBlockRewards);
  }, [initialBlockRewards]);

  const fetchRewards = useCallback(async () => {
    setIsLoading(true);
    try {
      const rewards = await getRewards(walletAddress, {
        page: pageRef.current,
        limit: REWARDS_PER_PAGE,
        filter: filterRef.current,
      });
      setBlockRewards(rewards.block_rewards);
      const pg = rewards.pagination ?? null;
      setPagination(pg);
      if (pg) {
        if (filterRef.current === "all") setTotalAll(pg.total);
        else setTotalUnclaimed(pg.total);
      }
    } catch (err: unknown) {
      setSectionError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when page or filter changes
  useEffect(() => {
    fetchRewards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardsPage, rewardFilter]);

  const claimableSubs = useMemo(
    () => submissions.filter((s) => s.status === "approved" && s.on_chain_id != null),
    [submissions],
  );

  const claimableMerkle = useMemo(
    () => blockRewards.filter((br) => br.merkle_block && br.reward_amount && !br.claimed),
    [blockRewards],
  );

  const unclaimedAmount = useMemo(() => {
    const legacyAmount = claimableSubs.reduce((sum, s) => sum + parseFloat(s.reward_amount || "0"), 0);
    const merkleAmount = claimableMerkle.reduce((sum, br) => sum + parseFloat(br.reward_amount || "0"), 0);
    return legacyAmount + merkleAmount;
  }, [claimableSubs, claimableMerkle]);

  const handleClaim = async (sub: Submission) => {
    if (!signer || sub.on_chain_id == null) return;
    setClaimingId(sub.id);
    setSectionError(null);
    try {
      const txHash = await claimReward(signer, sub.on_chain_id);
      await markClaimed(signer, walletAddress, sub.on_chain_id, txHash).catch(() => {
        setSectionError("Claimed on-chain but failed to update dashboard. Please refresh.");
      });
      await fetchRewards();
    } catch (err: unknown) {
      setSectionError((err as Error).message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleMerkleClaim = async (br: BlockReward) => {
    if (!signer || !br.reward_amount) return;
    setClaimingId(br.id);
    setSectionError(null);
    try {
      const proofData = await getMerkleProof(walletAddress, br.block_number);
      await claimMerkleReward(signer, br.block_number, proofData.share_bps, proofData.proof);
      await fetchRewards();
    } catch (err: unknown) {
      setSectionError((err as Error).message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimAll = async () => {
    if (!signer) return;
    setClaimingAll(true);
    setSectionError(null);
    try {
      if (claimableSubs.length > 0) {
        const onChainIds = claimableSubs.map((s) => s.on_chain_id!);
        const txHash = await batchClaimRewards(signer, onChainIds);
        for (const sub of claimableSubs) {
          await markClaimed(signer, walletAddress, sub.on_chain_id!, txHash).catch(() => {});
        }
      }
      if (claimableMerkle.length > 0) {
        const proofs = await Promise.all(
          claimableMerkle.map((br) => getMerkleProof(walletAddress, br.block_number)),
        );
        const blockNumbers = proofs.map((p) => p.block_number);
        const shareBpsArr = proofs.map((p) => p.share_bps);
        const proofArrays = proofs.map((p) => p.proof);
        await batchClaimMerkleRewards(signer, blockNumbers, shareBpsArr, proofArrays);
      }
      await fetchRewards();
      await onDataRefresh();
    } catch (err: unknown) {
      setSectionError((err as Error).message);
    } finally {
      setClaimingAll(false);
    }
  };

  const handleFilterChange = (v: RewardFilter) => {
    setRewardFilter(v);
    setRewardsPage(1);
  };

  const totalForCurrentFilter = rewardFilter === "all" ? totalAll : totalUnclaimed;
  const showEmpty = (pagination?.total ?? blockRewards.length) === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Block Rewards</h3>
          <div className="flex items-center gap-1">
            <FilterTab
              value="unclaimed"
              current={rewardFilter}
              label="Unclaimed"
              count={totalUnclaimed ?? undefined}
              onClick={handleFilterChange}
            />
            <FilterTab
              value="all"
              current={rewardFilter}
              label="All"
              count={totalAll ?? undefined}
              onClick={handleFilterChange}
            />
          </div>
        </div>
        {claimableSubs.length + claimableMerkle.length > 1 && signer && (
          <button
            onClick={handleClaimAll}
            disabled={claimingAll || claimingId != null}
            className="px-4 py-1.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          >
            {claimingAll ? "Claiming..." : `Claim All (${fmtWvrn(totalUnclaimedWvrn || unclaimedAmount)} WVRN)`}
          </button>
        )}
      </div>

      {sectionError && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          {sectionError}
          <button onClick={() => setSectionError(null)} className="ml-3 text-red-400/60 hover:text-red-400">dismiss</button>
        </div>
      )}

      <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0F]/60 rounded-xl backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-weavrn-muted text-xs font-mono">
            <svg className="w-4 h-4 animate-spin text-weavrn-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        </div>
      )}
      {showEmpty && !isLoading ? (
        rewardFilter === "unclaimed" ? (
          <div className="text-center py-8 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            All rewards claimed. Switch to &quot;All&quot; to view history.
          </div>
        ) : (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No block rewards yet. Rewards are calculated when each block closes.
          </div>
        )
      ) : showEmpty && isLoading ? (
        <div className="py-12" />
      ) : (
        <>
          <div className="space-y-2">
            {blockRewards.map((br) => {
              const sub = submissions.find((s) => s.id === br.submission_id);
              return (
                <div
                  key={br.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-white font-mono text-xs">Block {br.block_number}</span>
                    <span className="text-weavrn-muted font-mono text-xs">
                      {br.x_post_count > 0 && <><span className="text-white/70">X</span> {br.x_post_count}p &Delta;{br.x_delta}</>}
                      {br.x_post_count > 0 && br.yt_post_count > 0 && <span className="mx-1.5 text-weavrn-border">|</span>}
                      {br.yt_post_count > 0 && <><span className="text-red-400/70">YT</span> {br.yt_post_count}p &Delta;{br.yt_delta}</>}
                      {!br.x_post_count && !br.yt_post_count && <>{br.post_count} post{br.post_count !== 1 ? "s" : ""} &mdash; delta {br.delta_score}</>}
                      {br.block_share_pct != null && <> &mdash; {br.block_share_pct}%</>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(br.merkle_block ? br.reward_amount : sub?.reward_amount) != null && (
                      <span className="text-weavrn-muted font-mono text-xs">
                        {fmtWvrn(parseFloat((br.merkle_block ? br.reward_amount : sub?.reward_amount) || "0"))} WVRN
                      </span>
                    )}
                    {(br.merkle_block ? br.claim_tx_hash : sub?.tx_hash)?.startsWith("0x") && (
                      <a
                        href={getExplorerTxUrl((br.merkle_block ? br.claim_tx_hash : sub?.tx_hash)!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-weavrn-muted/50 hover:text-weavrn-muted font-mono text-[10px]"
                      >
                        tx
                      </a>
                    )}
                    {br.merkle_block && !br.claimed && br.reward_amount && signer && (
                      <button
                        onClick={() => handleMerkleClaim(br)}
                        disabled={claimingId === br.id || claimingAll}
                        className="px-3 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {claimingId === br.id ? "Claiming..." : "Claim"}
                      </button>
                    )}
                    {!br.merkle_block && sub && sub.status === "approved" && sub.on_chain_id != null && signer && (
                      <button
                        onClick={() => handleClaim(sub)}
                        disabled={claimingId === sub.id || claimingAll}
                        className="px-3 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {claimingId === sub.id ? "Claiming..." : "Claim"}
                      </button>
                    )}
                    {br.merkle_block ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${br.claimed ? STATUS_STYLES.claimed : STATUS_STYLES.approved}`}>
                        {br.claimed ? "claimed" : "claimable"}
                      </span>
                    ) : sub && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${STATUS_STYLES[sub.status] || STATUS_STYLES.pending}`}>
                        {sub.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setRewardsPage((p) => p - 1)}
                disabled={rewardsPage === 1}
                className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-xs font-mono text-weavrn-muted">
                {rewardsPage} / {pagination.total_pages}
              </span>
              <button
                onClick={() => setRewardsPage((p) => p + 1)}
                disabled={rewardsPage === pagination.total_pages}
                className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
});

export default BlockRewardsSection;
