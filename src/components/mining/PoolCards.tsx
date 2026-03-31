"use client";

import { memo } from "react";
import type { MiningStatsResponse } from "@/lib/api";

interface PoolCardsProps {
  pools: NonNullable<MiningStatsResponse["pools"]>;
  currentEmission: string;
  showYouTube: boolean;
}

const PoolCards = memo(function PoolCards({ pools, currentEmission, showYouTube }: PoolCardsProps) {
  if (!showYouTube) {
    return (
      <div className="glow-card rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white">This Block</span>
            </div>
            <div className="text-xl font-bold gradient-text font-mono">
              {parseFloat(currentEmission).toLocaleString(undefined, { maximumFractionDigits: 0 })} WVRN
            </div>
            <div className="text-[10px] text-weavrn-muted font-mono mt-1">up for grabs</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{pools.x.miners}</div>
            <div className="text-[10px] text-weavrn-muted font-mono">miner{pools.x.miners !== 1 ? "s" : ""} competing</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glow-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-white">X Pool</span>
          <span className="text-[10px] text-weavrn-muted font-mono">
            {pools.x.pct}%
          </span>
        </div>
        <div className="text-lg font-bold gradient-text font-mono">
          {parseFloat(pools.x.emission).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}{" "}
          WVRN
        </div>
        <div className="text-[10px] text-weavrn-muted font-mono mt-1">
          {pools.x.miners} miner{pools.x.miners !== 1 ? "s" : ""} this block
        </div>
      </div>
      <div className="glow-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-white">YouTube Pool</span>
          <span className="text-[10px] text-weavrn-muted font-mono">
            {pools.youtube.pct}%
          </span>
        </div>
        <div className="text-lg font-bold gradient-text font-mono">
          {parseFloat(pools.youtube.emission).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}{" "}
          WVRN
        </div>
        <div className="text-[10px] text-weavrn-muted font-mono mt-1">
          {pools.youtube.miners} miner
          {pools.youtube.miners !== 1 ? "s" : ""} this block
        </div>
      </div>
    </div>
  );
});

export default PoolCards;
