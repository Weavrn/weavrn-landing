"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getEarningsHistory } from "@/lib/api";
import type { EarningsBlock } from "@/lib/api";

interface Props {
  walletAddress: string;
  refreshKey?: number;
}

const CHART_HEIGHT = 140;
const BAR_GAP = 3;

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function EarningsChart({ walletAddress, refreshKey }: Props) {
  const [blocks, setBlocks] = useState<EarningsBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEarningsHistory(walletAddress);
      setBlocks(res.blocks.slice(-30).reverse());
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

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

  if (loading) {
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
        {hoveredIdx !== null && blocks[hoveredIdx] && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-weavrn-muted">
            <span className="text-white">Block {blocks[hoveredIdx].block_number}</span>
            <span>delta {blocks[hoveredIdx].delta_score}</span>
            <span className="text-weavrn-accent">+{fmtWvrn(earnings[hoveredIdx])} WVRN</span>
            <span>cumulative {fmtWvrn(cumulative[hoveredIdx])}</span>
          </div>
        )}
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
            const x = i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - h;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={b.block_number}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Hover target (full height) */}
                <rect
                  x={x}
                  y={0}
                  width={barWidth}
                  height={CHART_HEIGHT}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, 2)}
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
}
