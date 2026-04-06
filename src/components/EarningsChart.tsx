"use client";

import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getEarningsHistory } from "@/lib/api";
import type { EarningsBlock } from "@/lib/api";

interface Props {
  walletAddress: string;
  historyRefreshKey?: number;
}

const CHART_HEIGHT = 140;
const BAR_GAP = 3;

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default memo(function EarningsChart({ walletAddress, historyRefreshKey }: Props) {
  const [blocks, setBlocks] = useState<EarningsBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    // After initial load, skip showing the loading placeholder (stale-while-revalidate)
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const res = await getEarningsHistory(walletAddress);
      setBlocks(res.blocks.slice(-30).reverse());
      hasLoadedOnce.current = true;
    } catch {
      if (!hasLoadedOnce.current) {
        setBlocks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData, historyRefreshKey]);

  const earnings = useMemo(
    () => blocks.map((b) => parseFloat(b.reward_amount ?? "0")),
    [blocks]
  );

  const cumulative = useMemo(() => {
    let sum = 0;
    return earnings.map((e) => {
      sum += e;
      return sum;
    });
  }, [earnings]);

  const totalEarned = cumulative.length > 0 ? cumulative[cumulative.length - 1] : 0;

  if (loading && !hasLoadedOnce.current) {
    return (
      <div className="glow-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Earnings</h3>
        <div className="text-center py-12 text-weavrn-muted text-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  const maxEarned = Math.max(...earnings, 1);
  const barCount = blocks.length;
  const chartWidth = 600;
  const barWidth = Math.max(
    (chartWidth - BAR_GAP * (barCount - 1)) / barCount,
    6
  );
  const svgWidth = barCount * (barWidth + BAR_GAP) - BAR_GAP;
  const totalHeight = CHART_HEIGHT + 4;

  return (
    <div className="glow-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Earnings</h3>
        <div className="text-right">
          <span className="text-xs text-weavrn-muted font-mono">
            {blocks.length} blocks &middot;{" "}
          </span>
          <span className="text-sm font-bold gradient-text font-mono">
            {fmtWvrn(totalEarned)} WVRN
          </span>
        </div>
      </div>

      {/* Hovered block detail */}
      <div className="h-5 mb-2">
        {hoveredIdx !== null && blocks[hoveredIdx] && (() => {
          const b = blocks[hoveredIdx];
          const hasX = b.x_post_count > 0;
          const hasYT = b.yt_post_count > 0;
          return (
            <div className="flex items-center gap-3 text-[10px] font-mono text-weavrn-muted">
              <span className="text-white">Block {b.block_number}</span>
              {hasX && <span><span className="text-white/70">X</span> {b.x_post_count}p &Delta;{b.x_delta}</span>}
              {hasYT && <span><span className="text-red-400/70">YT</span> {b.yt_post_count}p &Delta;{b.yt_delta}</span>}
              {!hasX && !hasYT && <span>delta {b.delta_score}</span>}
              <span className="text-weavrn-accent">+{fmtWvrn(earnings[hoveredIdx])} WVRN</span>
            </div>
          );
        })()}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full"
          style={{ minWidth: Math.min(svgWidth, 300) }}
        >
          {blocks.map((b, i) => {
            const earned = earnings[i];
            const h = maxEarned > 0 ? (earned / maxEarned) * (CHART_HEIGHT - 16) : 0;
            const bx = i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - h;
            const isHovered = hoveredIdx === i;

            // Platform split for stacked bar
            const totalDelta = (b.x_delta || 0) + (b.yt_delta || 0);
            const xRatio = totalDelta > 0 ? (b.x_delta || 0) / totalDelta : 1;
            const xH = Math.max(h * xRatio, 0);
            const ytH = h - xH;

            return (
              <g
                key={b.block_number}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect x={bx} y={0} width={barWidth} height={CHART_HEIGHT} fill="transparent" />
                {/* YouTube portion (bottom) */}
                {ytH > 0 && (
                  <rect
                    x={bx} y={CHART_HEIGHT - ytH} width={barWidth} height={ytH}
                    rx={barWidth > 6 ? 2 : 1}
                    fill={isHovered ? "#FF6B6B" : "#EF4444"}
                    opacity={isHovered ? 0.9 : 0.6}
                  />
                )}
                {/* X portion (top, stacked above YouTube) */}
                <rect
                  x={bx} y={y} width={barWidth} height={Math.max(xH, earned > 0 ? 2 : 0)}
                  rx={barWidth > 6 ? 2 : 1}
                  fill={isHovered ? "#00F0C0" : "#00D4AA"}
                  opacity={isHovered ? 1 : earned > 0 ? 0.7 : 0.2}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});
