"use client";

import { useState, useEffect, useCallback } from "react";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";

type Tab = "block" | "alltime";

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function MiningLeaderboard() {
  const [tab, setTab] = useState<Tab>("block");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const param = tab === "alltime" ? "alltime" as const : undefined;
      const res = await getLeaderboard(param);
      setEntries(res.leaderboard.slice(0, 20));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="glow-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Leaderboard</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("block")}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              tab === "block"
                ? "bg-weavrn-surface text-white border border-weavrn-border"
                : "text-weavrn-muted hover:text-white"
            }`}
          >
            This Block
          </button>
          <button
            onClick={() => setTab("alltime")}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              tab === "alltime"
                ? "bg-weavrn-surface text-white border border-weavrn-border"
                : "text-weavrn-muted hover:text-white"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-weavrn-muted text-sm">
          Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
          No leaderboard data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-weavrn-muted border-b border-weavrn-border/30">
                <th className="text-left py-2 pr-3 text-xs">#</th>
                <th className="text-left py-2 px-3 text-xs">Handle</th>
                <th className="text-right py-2 px-3 text-xs">Score</th>
                <th className="text-right py-2 pl-3 text-xs">WVRN</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const handle = e.x_handle || e.yt_handle;
                const platform = e.yt_handle && !e.x_handle ? "YT" : "X";
                const score = e.total_delta ?? e.delta_score;
                const earned = parseFloat(e.total_earned ?? e.reward_amount ?? "0");

                return (
                  <tr
                    key={`${e.wallet_address}-${i}`}
                    className="border-b border-weavrn-border/10 hover:bg-weavrn-surface/30 transition-colors"
                  >
                    <td className="py-2 pr-3 text-weavrn-muted text-xs">
                      {i + 1}
                    </td>
                    <td className="py-2 px-3 text-white text-xs">
                      {handle ? (
                        <span>
                          <span className="text-weavrn-muted">{platform}</span>{" "}
                          {handle}
                        </span>
                      ) : (
                        <span className="text-weavrn-muted">
                          {e.wallet_address.slice(0, 6)}...{e.wallet_address.slice(-4)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-weavrn-muted text-xs">
                      {score.toLocaleString()}
                    </td>
                    <td className="py-2 pl-3 text-right text-weavrn-accent text-xs">
                      {fmtWvrn(earned)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
