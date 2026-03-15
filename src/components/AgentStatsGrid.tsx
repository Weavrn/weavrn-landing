"use client";

interface Props {
  stats: {
    escrowVolume: string;
    releasedVolume: string;
    totalEscrows: number;
    activeEscrows: number;
    jobsCompleted: number;
    avgRating: number;
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glow-card rounded-xl p-4">
      <p className="text-xs text-weavrn-muted mb-1">{label}</p>
      <p className="text-xl font-bold font-mono">{value}</p>
    </div>
  );
}

export default function AgentStatsGrid({ stats }: Props) {
  const formatETH = (val: string) => {
    const num = parseFloat(val);
    if (num === 0) return "0";
    return num.toFixed(6);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Escrow Volume" value={`${formatETH(stats.escrowVolume)} ETH`} />
      <StatCard label="ETH Released" value={`${formatETH(stats.releasedVolume)} ETH`} />
      <StatCard label="Jobs Completed" value={stats.jobsCompleted} />
      <StatCard label="Total Escrows" value={stats.totalEscrows} />
      <StatCard label="Active Escrows" value={stats.activeEscrows} />
      <StatCard label="Avg Rating" value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"} />
    </div>
  );
}
