"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getRewards,
  getProfile,
  getMiningStats,
  type CurrentBlock,
  type BlockReward,
  type TrackedPost,
  type Submission,
  type Profile,
  type MiningStatsResponse,
} from "@/lib/api";
import { stableUpdate } from "@/lib/stableUpdate";

interface WalletSummary {
  balance: string;
  total_earned: string;
}

export interface UseMiningDataReturn {
  currentBlock: CurrentBlock | null;
  blockRewards: BlockReward[];
  trackedPosts: TrackedPost[];
  submissions: Submission[];
  walletSummary: WalletSummary | null;
  profile: Profile | null;
  miningStats: MiningStatsResponse | null;
  historyRefreshKey: number;

  isInitialLoad: boolean;
  isRefreshing: boolean;

  error: string | null;
  setError: (msg: string | null) => void;

  refreshData: () => Promise<void>;
}

export function useMiningData(walletAddress: string): UseMiningDataReturn {
  const [currentBlock, setCurrentBlock] = useState<CurrentBlock | null>(null);
  const [blockRewards, setBlockRewards] = useState<BlockReward[]>([]);
  const [trackedPosts, setTrackedPosts] = useState<TrackedPost[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [miningStats, setMiningStats] = useState<MiningStatsResponse | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRefreshingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const refreshData = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const [rewards, p, stats] = await Promise.all([
        getRewards(walletAddress),
        getProfile(walletAddress),
        getMiningStats().catch(() => null),
      ]);

      // Track whether reward-affecting slices changed for historyRefreshKey
      let rewardDataChanged = false;

      setCurrentBlock((prev) => stableUpdate(prev, rewards.current_block));

      setBlockRewards((prev) => {
        const next = stableUpdate(prev, rewards.block_rewards);
        if (next !== prev) rewardDataChanged = true;
        return next;
      });

      setTrackedPosts((prev) => stableUpdate(prev, rewards.tracked_posts));
      setSubmissions((prev) => {
        const next = stableUpdate(prev, rewards.submissions);
        if (next !== prev) rewardDataChanged = true;
        return next;
      });

      setWalletSummary((prev) => {
        const next = stableUpdate(prev, {
          balance: rewards.balance,
          total_earned: rewards.total_earned,
        });
        if (next !== prev) rewardDataChanged = true;
        return next;
      });

      setProfile((prev) => stableUpdate(prev, p));
      if (stats) {
        setMiningStats((prev) => stableUpdate(prev, stats));
      }

      if (rewardDataChanged) {
        setHistoryRefreshKey((k) => k + 1);
      }

      setError(null);
      hasLoadedRef.current = true;
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsInitialLoad(false);
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [walletAddress]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    currentBlock,
    blockRewards,
    trackedPosts,
    submissions,
    walletSummary,
    profile,
    miningStats,
    historyRefreshKey,
    isInitialLoad,
    isRefreshing,
    error,
    setError,
    refreshData,
  };
}
