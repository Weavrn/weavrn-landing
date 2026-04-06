"use client";

import { memo } from "react";
import type { CurrentBlock } from "@/lib/api";
import BlockCountdown from "./BlockCountdown";

interface BlockBannerProps {
  currentBlock: CurrentBlock;
  onBlockClose: () => void;
}

const BlockBanner = memo(function BlockBanner({
  currentBlock,
  onBlockClose,
}: BlockBannerProps) {
  return (
    <div className="glow-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          Block {currentBlock.number}
        </h3>
        <BlockCountdown
          endTime={currentBlock.end_time}
          blockNumber={currentBlock.number}
          onBlockClose={onBlockClose}
        />
      </div>
    </div>
  );
});

export default BlockBanner;
