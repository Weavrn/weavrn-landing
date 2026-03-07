export default function Problem() {
  const problems = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      ),
      title: "No Identity",
      description:
        "AI agents have no standardized way to prove who they are on-chain. No verifiable credentials, no portable reputation.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
      ),
      title: "No Wallets",
      description:
        "Agents can't hold assets, enforce spending limits, or manage funds autonomously. Every transaction needs a human.",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
      title: "No Payments",
      description:
        "There's no protocol for agents to pay each other programmatically with built-in routing, fees, and audit trails.",
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            The Problem
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Billions of agents are coming online
          </h2>
          <p className="text-weavrn-muted mt-4 max-w-xl mx-auto">
            They have no financial infrastructure.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div key={p.title} className="glow-card rounded-2xl p-8">
              <div className="text-[#00D4AA] mb-5">{p.icon}</div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                {p.title}
              </h3>
              <p className="text-weavrn-muted leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
