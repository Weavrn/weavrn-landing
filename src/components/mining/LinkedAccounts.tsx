"use client";

import { memo } from "react";
import { features } from "@/lib/features";

interface LinkedAccountsProps {
  xHandle: string | null;
  ytHandle: string | null;
  onUnlinkX: () => void;
  onUnlinkYT: () => void;
}

const LinkedAccounts = memo(function LinkedAccounts({
  xHandle,
  ytHandle,
  onUnlinkX,
  onUnlinkYT,
}: LinkedAccountsProps) {
  const hasAny = xHandle || ytHandle;
  if (!hasAny) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-weavrn-border/30 bg-weavrn-surface/20 px-5 py-3">
      <div className="flex items-center gap-6">
        {xHandle && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-weavrn-muted/50 uppercase tracking-wider">X</span>
            <span className="text-sm text-white">@{xHandle}</span>
            <button
              onClick={onUnlinkX}
              className="text-xs text-weavrn-muted/40 hover:text-weavrn-accent transition-colors"
            >
              change
            </button>
          </div>
        )}
        {features.youtube && ytHandle && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-weavrn-muted/50 uppercase tracking-wider">YouTube</span>
            <span className="text-sm text-white">@{ytHandle}</span>
            <button
              onClick={onUnlinkYT}
              className="text-xs text-weavrn-muted/40 hover:text-weavrn-accent transition-colors"
            >
              change
            </button>
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono text-weavrn-muted/30 uppercase tracking-widest">Linked Accounts</span>
    </div>
  );
});

export default LinkedAccounts;
