"use client";

import { memo } from "react";
import { addTokenToWallet } from "@/lib/contracts";

interface StatsGridProps {
  postCount: number;
  totalEarned: string;
  unclaimedAmount: number;
  balance: string;
}

const StatsGrid = memo(function StatsGrid({
  postCount,
  totalEarned,
  unclaimedAmount,
  balance,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="glow-card rounded-xl p-4 text-center">
        <div className="text-xl font-bold text-white">{postCount}</div>
        <div className="text-[10px] text-weavrn-muted font-mono mt-1">
          Tracked Posts
        </div>
      </div>
      <div className="glow-card rounded-xl p-4 text-center">
        <div className="text-xl font-bold gradient-text">
          {Math.floor(parseFloat(totalEarned || "0")).toLocaleString()}
        </div>
        <div className="text-[10px] text-weavrn-muted font-mono mt-1">
          Total Earned
        </div>
      </div>
      <div className="glow-card rounded-xl p-4 text-center">
        <div
          className={`text-xl font-bold ${unclaimedAmount > 0 ? "text-weavrn-accent" : "text-white"}`}
        >
          {Math.floor(unclaimedAmount).toLocaleString()}
        </div>
        <div className="text-[10px] text-weavrn-muted font-mono mt-1">
          Unclaimed
        </div>
      </div>
      <div className="glow-card rounded-xl p-4 text-center">
        <div className="text-xl font-bold text-white">
          {parseFloat(balance || "0").toLocaleString(undefined, {
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
  );
});

export default StatsGrid;
