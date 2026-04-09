"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";

function formatCountdown(endTimestamp: number): string {
  const remaining = endTimestamp - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Closing...";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

interface BlockCountdownProps {
  endTime: number;
  blockNumber: number;
  onBlockClose: () => void;
}

const BlockCountdown = memo(function BlockCountdown({
  endTime,
  blockNumber,
  onBlockClose,
}: BlockCountdownProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(endTime));
  const lastClosedBlockRef = useRef<number | null>(null);
  const isClosingRef = useRef(false);

  const handleBlockClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      onBlockClose();
    } finally {
      isClosingRef.current = false;
    }
  }, [onBlockClose]);

  useEffect(() => {
    const update = () => {
      const remaining = endTime - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        setCountdown("Closing...");
        if (lastClosedBlockRef.current !== blockNumber) {
          lastClosedBlockRef.current = blockNumber;
          handleBlockClose();
        }
        return;
      }
      setCountdown(formatCountdown(endTime));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime, blockNumber, handleBlockClose]);

  return (
    <div className="text-right">
      <div className="text-lg font-bold gradient-text">{countdown}</div>
      <div className="text-xs text-weavrn-muted font-mono mt-0.5">
        until close
      </div>
    </div>
  );
});

export default BlockCountdown;
