"use client";

import { SOCIAL_LINKS } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Background effects */}
      <div className="hero-glow absolute inset-0" />
      <div className="bg-grid absolute inset-0" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#00D4AA]/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#00A3FF]/5 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-weavrn-border bg-weavrn-surface/50 text-sm text-weavrn-muted animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
          Building on Base
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-8 animate-slide-up leading-[1.05]">
          Financial Infrastructure
          <br />
          for the{" "}
          <span className="gradient-text">Agent Economy</span>
        </h1>

        <p className="text-lg md:text-xl text-weavrn-muted max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Decentralized identity, programmable wallets, and atomic payments
          — enabling autonomous agents to transact without human intervention.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <a
            href="/mine"
            className="group px-8 py-3.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,170,0.3)]"
          >
            Start Mining
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&#8594;</span>
          </a>
          <a
            href={SOCIAL_LINKS.discord || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg font-semibold transition-all duration-300 hover:bg-weavrn-surface"
          >
            Join Discord
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "0.8s" }}>
          {[
            { value: "1B", label: "Total Supply" },
            { value: "10K", label: "Daily Rewards" },
            { value: "$0", label: "Presale" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-weavrn-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
    </section>
  );
}
