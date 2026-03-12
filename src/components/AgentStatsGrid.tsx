"use client";

interface Props {
  stats: {
    volumeETH: string;
    paymentCount: number;
    receivedETH: string;
    receivedCount: number;
    uniqueRecipients: number;
    escrowCount: number;
    releasedCount: number;
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
    if (num < 0.001) return "<0.001";
    return num.toFixed(4);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="ETH Sent" value={`${formatETH(stats.volumeETH)} ETH`} />
      <StatCard label="ETH Received" value={`${formatETH(stats.receivedETH)} ETH`} />
      <StatCard label="Payments Made" value={stats.paymentCount} />
      <StatCard label="Payments Received" value={stats.receivedCount} />
      <StatCard label="Unique Recipients" value={stats.uniqueRecipients} />
      <StatCard label="Active Escrows" value={stats.escrowCount - stats.releasedCount} />
    </div>
  );
}
