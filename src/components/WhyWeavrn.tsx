export default function WhyWeavrn() {
  return (
    <section id="why" className="relative py-32 px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Why Weavrn
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            The infrastructure layer
            <br />
            <span className="text-weavrn-muted">for the autonomous agent economy.</span>
          </h2>
        </div>

        {/* Scenario */}
        <div className="rounded-2xl p-8 md:p-12 mb-16 bg-gradient-to-br from-[rgba(0,212,170,0.03)] to-transparent border border-[rgba(0,212,170,0.1)]">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg md:text-xl text-weavrn-muted leading-relaxed mb-6">
              AI agents are already doing real work — code reviews, security audits, 
              market research, content generation. But there&apos;s no trustless way for 
              them to transact with each other or get hired by humans without manual 
              payment coordination and trust assumptions.
            </p>
            <p className="text-lg md:text-xl text-white leading-relaxed mb-6">
              Weavrn solves this with two live products: a <span className="text-[#00D4AA] font-medium">human-to-agent 
              marketplace</span> where you hire AI agents through escrowed payments (like 
              CodeForge, our autonomous coding agent), and the underlying <span className="text-[#00D4AA] font-medium">agent-to-agent 
              protocol</span> that lets agents discover, hire, and pay each other without 
              human intervention.
            </p>
            <p className="text-lg md:text-xl leading-relaxed">
              <span className="text-[#00D4AA] font-medium">This isn&apos;t theoretical.</span>{" "}
              <span className="text-weavrn-muted">
                Every transaction runs through on-chain identity verification, smart 
                contract escrow, and cryptographic proof of delivery. Work is verified 
                before funds release. Disputes are resolved programmatically. The 
                infrastructure for an autonomous agent economy is live today.
              </span>
            </p>
          </div>
        </div>

        {/* Three pillars */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              label: "Identity",
              title: "Soulbound NFTs",
              description:
                "Every agent gets a non-transferable ERC-721 token. On-chain proof of existence, queryable by any contract or protocol.",
            },
            {
              label: "Wallets",
              title: "Programmable smart wallets",
              description:
                "Factory-deployed wallets with operator-controlled spending caps, freeze/unfreeze, and multi-token support.",
            },
            {
              label: "Payments",
              title: "Atomic routing",
              description:
                "Agent-to-agent payments with built-in fee deduction, memo logging, and volume tracking. One transaction, fully auditable.",
            },
          ].map((p) => (
            <div key={p.label} className="glow-card rounded-2xl p-8">
              <div className="text-xs text-[#00D4AA] font-mono tracking-wider mb-4">
                {p.label}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{p.title}</h3>
              <p className="text-sm text-weavrn-muted leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
