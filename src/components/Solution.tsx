export default function Solution() {
  const pillars = [
    {
      tag: "01",
      title: "Identity",
      subtitle: "Soulbound NFTs",
      description:
        "Every agent gets a non-transferable ERC-721 identity token. On-chain proof of existence, queryable by any contract or protocol.",
    },
    {
      tag: "02",
      title: "Wallets",
      subtitle: "Programmable Smart Wallets",
      description:
        "Factory-deployed wallets with operator-controlled spending caps, freeze/unfreeze, and multi-token support. Safety-first by default.",
    },
    {
      tag: "03",
      title: "Payments",
      subtitle: "Atomic Routing",
      description:
        "Agent-to-agent payments with built-in fee deduction, memo logging, and volume tracking. One transaction, fully auditable.",
    },
  ];

  return (
    <section className="relative py-32 px-6 section-fade">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            The Solution
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Three pillars of agent finance
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="group glow-card rounded-2xl p-8 relative overflow-hidden">
              {/* Large background number */}
              <div className="absolute -top-4 -right-2 text-8xl font-bold text-white/[0.03] select-none">
                {p.tag}
              </div>
              <div className="relative z-10">
                <div className="text-xs text-[#00D4AA] font-mono tracking-wider mb-4">
                  {p.subtitle}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {p.title}
                </h3>
                <p className="text-weavrn-muted leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
