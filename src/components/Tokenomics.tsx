"use client";

import { useState } from "react";
import { TOKEN_ALLOCATIONS } from "@/lib/constants";

export default function Tokenomics() {
  const total = TOKEN_ALLOCATIONS.reduce((sum, a) => sum + a.pct, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  let cumulative = 0;

  return (
    <section id="tokenomics" className="relative py-32 px-6 section-fade scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-weavrn-accent text-sm font-mono font-medium tracking-wider uppercase mb-4">
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
          <div
            className="relative w-72 h-72 flex-shrink-0"
            onMouseLeave={() => setHovered(null)}
          >
            {/* Outer glow */}
            <div
              className="absolute inset-0 rounded-full blur-[40px] transition-colors duration-300"
              style={{
                backgroundColor: hovered !== null
                  ? `${TOKEN_ALLOCATIONS[hovered].color}12`
                  : "rgba(0,212,170,0.05)",
              }}
            />
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 relative z-10">
              {TOKEN_ALLOCATIONS.map((alloc, i) => {
                const dashArray = (alloc.pct / total) * 100;
                const dashOffset = -(cumulative / total) * 100;
                cumulative += alloc.pct;
                const isActive = hovered === i;
                const isDimmed = hovered !== null && hovered !== i;
                return (
                  <circle
                    key={alloc.label}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={alloc.color}
                    strokeWidth={isActive ? "4.5" : "3"}
                    strokeDasharray={`${dashArray} ${100 - dashArray}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                    strokeOpacity={isDimmed ? 0.25 : 1}
                    className="transition-all duration-300 cursor-pointer"
                    style={isActive ? { filter: `drop-shadow(0 0 6px ${alloc.color}80)` } : undefined}
                    onMouseEnter={() => setHovered(i)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="text-center transition-opacity duration-200">
                {hovered !== null ? (
                  <>
                    <div className="text-3xl font-bold text-white">{TOKEN_ALLOCATIONS[hovered].pct}%</div>
                    <div className="text-xs text-weavrn-muted font-mono mt-1">{TOKEN_ALLOCATIONS[hovered].label}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: TOKEN_ALLOCATIONS[hovered].color }}>
                      {TOKEN_ALLOCATIONS[hovered].amount}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white">1B</div>
                    <div className="text-xs text-weavrn-muted font-mono mt-1">WVRN</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
            {TOKEN_ALLOCATIONS.map((alloc, i) => (
              <div
                key={alloc.label}
                className={`flex items-start gap-4 p-4 rounded-xl bg-weavrn-surface/50 border transition-all duration-200 cursor-pointer ${
                  hovered === i
                    ? "border-weavrn-border scale-[1.02]"
                    : hovered !== null
                      ? "border-weavrn-border/30 opacity-50"
                      : "border-weavrn-border/50 hover:border-weavrn-border"
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
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
