"use client";

import { TOKEN_ALLOCATIONS } from "@/lib/constants";

export default function Tokenomics() {
  const total = TOKEN_ALLOCATIONS.reduce((sum, a) => sum + a.pct, 0);
  let cumulative = 0;

  return (
    <section className="relative py-32 px-6 section-fade">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Tokenomics
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Fair launch. No presale.
          </h2>
          <p className="text-weavrn-muted mt-4 max-w-xl mx-auto">
            1 billion WVRN tokens with community-first distribution.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-20">
          {/* Donut chart */}
          <div className="relative w-72 h-72 flex-shrink-0">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-[#00D4AA]/5 blur-[40px]" />
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 relative z-10">
              {TOKEN_ALLOCATIONS.map((alloc) => {
                const dashArray = (alloc.pct / total) * 100;
                const dashOffset = -(cumulative / total) * 100;
                cumulative += alloc.pct;
                return (
                  <circle
                    key={alloc.label}
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={alloc.color}
                    strokeWidth="3"
                    strokeDasharray={`${dashArray} ${100 - dashArray}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">1B</div>
                <div className="text-xs text-weavrn-muted font-mono mt-1">WVRN</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
            {TOKEN_ALLOCATIONS.map((alloc) => (
              <div
                key={alloc.label}
                className="flex items-start gap-4 p-4 rounded-xl bg-weavrn-surface/50 border border-weavrn-border/50 hover:border-weavrn-border transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-offset-2 ring-offset-weavrn-dark"
                  style={{ backgroundColor: alloc.color }}
                />
                <div>
                  <div className="font-medium text-white">
                    {alloc.label}
                  </div>
                  <div className="text-sm text-weavrn-muted mt-0.5">
                    {alloc.amount} <span className="text-white/30">|</span> {alloc.pct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
