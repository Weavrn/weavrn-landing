"use client";

import { memo, useState, useMemo } from "react";
import type { JsonRpcSigner } from "ethers";
import {
  markClaimed,
  getMerkleProof,
  type Submission,
  type BlockReward,
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

type RewardFilter = "claimable" | "all";

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
      {count != null && count > 0 && (
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
  onDataRefresh: () => Promise<void>;
}

const BlockRewardsSection = memo(function BlockRewardsSection({
  blockRewards,
  submissions,
  signer,
  walletAddress,
  onDataRefresh,
}: BlockRewardsSectionProps) {
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("claimable");
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const claimableSubs = useMemo(
    () =>
      submissions.filter(
        (s) => s.status === "approved" && s.on_chain_id != null,
      ),
    [submissions],
  );

  const claimableMerkle = useMemo(
    () =>
      blockRewards.filter(
        (br) => br.merkle_block && br.reward_amount && !br.claimed,
      ),
    [blockRewards],
  );

  const unclaimedAmount = useMemo(() => {
    const legacyAmount = claimableSubs.reduce(
      (sum, s) => sum + parseFloat(s.reward_amount || "0"),
      0,
    );
    const merkleAmount = claimableMerkle.reduce(
      (sum, br) => sum + parseFloat(br.reward_amount || "0"),
      0,
    );
    return legacyAmount + merkleAmount;
  }, [claimableSubs, claimableMerkle]);

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
    () =>
      blockRewards.filter((br) => {
        if (br.merkle_block) return br.claimed;
        const sub = submissions.find((s) => s.id === br.submission_id);
        return sub?.status === "claimed";
      }).length,
    [blockRewards, submissions],
  );

  const handleClaim = async (sub: Submission) => {
    if (!signer || sub.on_chain_id == null) return;
    setClaimingId(sub.id);
    setSectionError(null);
    try {
      const txHash = await claimReward(signer, sub.on_chain_id);
      await markClaimed(signer, walletAddress, sub.on_chain_id, txHash).catch(
        () => {
          setSectionError(
            "Claimed on-chain but failed to update dashboard. Please refresh.",
          );
        },
      );
      await onDataRefresh();
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
      await claimMerkleReward(
        signer,
        br.block_number,
        proofData.share_bps,
        proofData.proof,
      );
      await onDataRefresh();
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
          await markClaimed(
            signer,
            walletAddress,
            sub.on_chain_id!,
            txHash,
          ).catch(() => {});
        }
      }
      if (claimableMerkle.length > 0) {
        const proofs = await Promise.all(
          claimableMerkle.map((br) =>
            getMerkleProof(walletAddress, br.block_number),
          ),
        );
        const blockNumbers = proofs.map((p) => p.block_number);
        const shareBpsArr = proofs.map((p) => p.share_bps);
        const proofArrays = proofs.map((p) => p.proof);

        await batchClaimMerkleRewards(
          signer,
          blockNumbers,
          shareBpsArr,
          proofArrays,
        );
      }
      await onDataRefresh();
    } catch (err: unknown) {
      setSectionError((err as Error).message);
    } finally {
      setClaimingAll(false);
    }
  };

  return (
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
        {claimableSubs.length + claimableMerkle.length > 1 && signer && (
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

      {sectionError && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          {sectionError}
          <button
            onClick={() => setSectionError(null)}
            className="ml-3 text-red-400/60 hover:text-red-400"
          >
            dismiss
          </button>
        </div>
      )}

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
                    {br.post_count} post{br.post_count !== 1 ? "s" : ""} &mdash;
                    delta {br.delta_score}
                    {br.block_share_pct != null && (
                      <> &mdash; {br.block_share_pct}% of block</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(br.merkle_block
                    ? br.reward_amount
                    : sub?.reward_amount) != null && (
                    <span className="text-weavrn-muted font-mono text-xs">
                      {fmtWvrn(
                        parseFloat(
                          (br.merkle_block
                            ? br.reward_amount
                            : sub?.reward_amount) || "0",
                        ),
                      )}{" "}
                      WVRN
                    </span>
                  )}
                  {(br.merkle_block
                    ? br.claim_tx_hash
                    : sub?.tx_hash) && (
                    <a
                      href={getExplorerTxUrl(
                        (br.merkle_block
                          ? br.claim_tx_hash
                          : sub?.tx_hash)!,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-weavrn-muted/50 hover:text-weavrn-muted font-mono text-[10px]"
                    >
                      tx
                    </a>
                  )}
                  {br.merkle_block &&
                    !br.claimed &&
                    br.reward_amount &&
                    signer && (
                      <button
                        onClick={() => handleMerkleClaim(br)}
                        disabled={claimingId === br.id || claimingAll}
                        className="px-3 py-1 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                      >
                        {claimingId === br.id ? "Claiming..." : "Claim"}
                      </button>
                    )}
                  {!br.merkle_block &&
                    sub &&
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
                  {br.merkle_block ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                        br.claimed
                          ? STATUS_STYLES.claimed
                          : STATUS_STYLES.approved
                      }`}
                    >
                      {br.claimed ? "claimed" : "claimable"}
                    </span>
                  ) : (
                    sub && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                          STATUS_STYLES[sub.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {sub.status}
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BlockRewardsSection;
