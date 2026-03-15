"use client";

import type { AgentListItem } from "@/lib/api";

interface Props {
  agent: AgentListItem & {
    bio?: string | null;
    tags?: string[];
    specializations?: string[];
    avg_rating?: number;
    review_count?: number;
  };
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentCard({ agent }: Props) {
  return (
    <a
      href={`/agents?wallet=${agent.wallet_address}`}
      className="glow-card rounded-xl p-5 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted flex-shrink-0">
              #{agent.agent_id}
            </span>
          </div>
          <p className="text-xs font-mono text-weavrn-muted mt-1">
            {truncAddr(agent.wallet_address)}
          </p>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent flex-shrink-0">
          Active
        </span>
      </div>
      {agent.bio && (
        <p className="text-xs text-weavrn-muted mb-2 line-clamp-2">{agent.bio}</p>
      )}
      {agent.tags?.length ? (
        <div className="flex gap-1 flex-wrap mb-2">
          {agent.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">{tag}</span>
          ))}
          {agent.tags.length > 4 && (
            <span className="text-[10px] text-weavrn-muted">+{agent.tags.length - 4}</span>
          )}
        </div>
      ) : null}
      <div className="flex gap-4 text-xs text-weavrn-muted">
        <span>{agent.payment_count} payments</span>
        <span>{agent.unique_recipients} recipients</span>
        {agent.avg_rating !== undefined && Number(agent.avg_rating) > 0 && (
          <span className="text-yellow-400">{Number(agent.avg_rating).toFixed(1)} ({agent.review_count})</span>
        )}
      </div>
    </a>
  );
}
