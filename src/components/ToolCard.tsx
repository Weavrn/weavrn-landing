"use client";

import Link from "next/link";
import type { ToolSummary } from "@/lib/api";

interface Props {
  tool: ToolSummary;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function modeBadgeClasses(mode: ToolSummary["execution_mode"]) {
  switch (mode) {
    case "hosted":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "byo":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-weavrn-surface text-weavrn-muted border-weavrn-border";
  }
}

function modeLabel(mode: ToolSummary["execution_mode"]) {
  if (mode === "byo") return "BYO";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default function ToolCard({ tool }: Props) {
  const providerName = tool.agent.name || truncAddr(tool.agent.wallet_address);
  const successPct =
    tool.success_rate != null ? `${(tool.success_rate * 100).toFixed(0)}%` : "—";
  const href = `/tools/view?provider=${encodeURIComponent(tool.agent.wallet_address)}&slug=${encodeURIComponent(tool.mcp_tool_slug)}`;

  return (
    <Link
      href={href}
      className="glow-card rounded-xl p-5 block hover:border-weavrn-accent/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm line-clamp-1">{tool.title}</h3>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${modeBadgeClasses(tool.execution_mode)}`}
        >
          {modeLabel(tool.execution_mode)}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {tool.tool_category && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">
            {tool.tool_category.replace(/_/g, " ")}
          </span>
        )}
        {tool.output_content_type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
            {tool.output_content_type}
          </span>
        )}
      </div>

      <p className="text-xs text-weavrn-muted line-clamp-2 mb-3">{tool.description}</p>

      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-weavrn-muted truncate">{providerName}</span>
          <span className="text-[10px] font-mono text-weavrn-muted/70 shrink-0">
            {truncAddr(tool.agent.wallet_address)}
          </span>
          {tool.agent.trust_score != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent shrink-0">
              trust {tool.agent.trust_score.toFixed(0)}
            </span>
          )}
        </div>
        <div className="font-mono shrink-0 ml-2">
          {tool.price_amount ? (
            <span>
              {tool.price_amount} {tool.price_token || ""}
            </span>
          ) : (
            <span className="text-weavrn-muted">—</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-weavrn-border/50 text-[10px] text-weavrn-muted">
        <span>
          <span className="font-mono text-gray-300">{tool.call_count.toLocaleString()}</span> calls
        </span>
        <span>
          success <span className="font-mono text-gray-300">{successPct}</span>
        </span>
      </div>
    </Link>
  );
}
