"use client";

import { useState, useEffect, useCallback } from "react";
import { getEarningsHistory } from "@/lib/api";
import type { EarningsBlock } from "@/lib/api";

interface Props {
  walletAddress: string;
}

const CHART_HEIGHT = 160;
const BAR_GAP = 4;

export default function EarningsChart({ walletAddress }: Props) {
  const [blocks, setBlocks] = useState<EarningsBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEarningsHistory(walletAddress);
      setBlocks(res.blocks.slice(-20).reverse());
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (blocks.length === 0) {
    return (
      <div className="glow-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Earnings</h3>
        <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
          No earnings data yet.
        </div>
      </div>
    );
  }

  const earnings = blocks.map((b) => parseFloat(b.reward_amount ?? "0"));
  const maxEarned = Math.max(...earnings, 1);
  const barCount = blocks.length;
  const chartWidth = 600;
  const barWidth = Math.max(
    (chartWidth - BAR_GAP * (barCount - 1)) / barCount,
    8,
  );
  const svgWidth = barCount * (barWidth + BAR_GAP) - BAR_GAP;
  const labelHeight = 24;
  const totalHeight = CHART_HEIGHT + labelHeight;

  return (
    <div className="glow-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Earnings</h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full"
          style={{ minWidth: Math.min(svgWidth, 400) }}
        >
          {blocks.map((b, i) => {
            const earned = earnings[i];
            const h =
              maxEarned > 0
                ? (earned / maxEarned) * (CHART_HEIGHT - 20)
                : 0;
            const x = i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - h;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={b.block_number}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, 1)}
                  rx={2}
                  fill={isHovered ? "#00F0C0" : "#00D4AA"}
                  opacity={isHovered ? 1 : 0.8}
                  className="transition-opacity"
                />
                {isHovered && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#00D4AA"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {Number(earned.toFixed(2)).toLocaleString()}
                  </text>
                )}
                <text
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 14}
                  textAnchor="middle"
                  fill="#6B7280"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {b.block_number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
