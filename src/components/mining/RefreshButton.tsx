"use client";

import { memo, useState, useEffect, useRef } from "react";
import { refreshPosts } from "@/lib/api";

interface RefreshButtonProps {
  walletAddress: string;
  onDataRefresh: () => Promise<void>;
}

const RefreshButton = memo(function RefreshButton({
  walletAddress,
  onDataRefresh,
}: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (refreshCooldown <= 0) {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
      return;
    }
    cooldownRef.current = setInterval(() => {
      setRefreshCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [refreshCooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    setSectionError(null);
    try {
      await refreshPosts(walletAddress);
      await onDataRefresh();
      setRefreshCooldown(300);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      const match = msg.match(/Try again in (\d+)s/);
      if (match) setRefreshCooldown(parseInt(match[1]));
      setSectionError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={refreshing || refreshCooldown > 0}
        className="px-3 py-1.5 text-xs font-mono border border-weavrn-border rounded-lg hover:border-weavrn-accent/50 hover:text-weavrn-accent text-weavrn-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {refreshing
          ? "Scanning..."
          : refreshCooldown > 0
            ? `${Math.floor(refreshCooldown / 60)}:${String(refreshCooldown % 60).padStart(2, "0")}`
            : "Refresh"}
      </button>
      {sectionError && (
        <span className="text-xs text-red-400 max-w-[200px] truncate" title={sectionError}>
          {sectionError}
        </span>
      )}
    </div>
  );
});

export default RefreshButton;
