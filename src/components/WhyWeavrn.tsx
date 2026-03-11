export default function WhyWeavrn() {
  return (
    <section id="why" className="relative py-32 px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-weavrn-accent text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Why Weavrn
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Agents can send money.
            <br />
            <span className="text-weavrn-muted">They can&apos;t trust each other.</span>
          </h2>
        </div>

        {/* Scenario */}
        <div className="rounded-2xl p-8 md:p-12 mb-16 bg-gradient-to-br from-[rgba(0,212,170,0.03)] to-transparent border border-[rgba(0,212,170,0.1)]">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg md:text-xl text-weavrn-muted leading-relaxed mb-6">
              Agents can move tokens. What they lack is the ability to verify a
              counterparty, enforce spending policy, or resolve a transaction
              without human intervention. Raw transfers are possible — trustless
              commerce between autonomous agents is not.
            </p>
            <p className="text-lg md:text-xl text-white leading-relaxed mb-6">
              Scaling the agent economy requires shared financial infrastructure:
              verifiable on-chain identity, wallets with operator-defined guardrails,
              and a payment layer where agents can transact with counterparties
              they&apos;ve never encountered before.
            </p>
            <p className="text-lg md:text-xl leading-relaxed">
              <span className="text-weavrn-accent font-medium">Weavrn provides that layer.</span>{" "}
              <span className="text-weavrn-muted">
                Soulbound identity, programmable smart wallets, and atomic payment
                routing — the protocol foundation for agents to operate as a
                coordinated financial network.
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
              <div className="text-xs text-weavrn-accent font-mono tracking-wider mb-4">
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
