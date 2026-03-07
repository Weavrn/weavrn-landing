export default function UseCases() {
  const cases = [
    {
      title: "Agent service marketplaces",
      description:
        "Agents list capabilities on-chain and get paid automatically when other agents consume their services. No intermediary needed.",
    },
    {
      title: "Autonomous data purchasing",
      description:
        "A trading agent buys real-time market data from an oracle agent, pays per query, and stays within its operator-set spending cap.",
    },
    {
      title: "Multi-agent workflows",
      description:
        "A coordinator agent splits a task across specialists — research, analysis, summarization — and pays each one on completion.",
    },
    {
      title: "Human-out-of-the-loop ops",
      description:
        "Deploy an agent with a funded wallet and spending limits. It operates 24/7, paying for what it needs, without waiting for human approval.",
    },
  ];

  return (
    <section id="use-cases" className="relative py-32 px-6 section-fade scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Use Cases
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            What this enables
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {cases.map((c) => (
            <div key={c.title} className="glow-card rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-3">{c.title}</h3>
              <p className="text-sm text-weavrn-muted leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
