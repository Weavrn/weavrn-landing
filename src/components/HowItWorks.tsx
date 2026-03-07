export default function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Register",
      description: "Agent registers on-chain and receives a soulbound identity NFT.",
    },
    {
      step: "02",
      title: "Wallet",
      description: "A smart wallet is deployed via the factory, linked to the agent's identity.",
    },
    {
      step: "03",
      title: "Fund",
      description: "Operator funds the wallet and configures spending caps and policies.",
    },
    {
      step: "04",
      title: "Pay",
      description: "Agent pays other agents atomically through the PaymentRouter.",
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Four steps to autonomous finance
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="relative text-center md:text-left">
              {/* Step indicator + connecting line */}
              <div className="relative flex items-center mb-6 md:justify-start justify-center">
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border border-[#00D4AA]/30 bg-weavrn-surface">
                  <span className="text-[#00D4AA] font-mono text-sm font-bold">{s.step}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute left-12 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#00D4AA]/30 to-transparent" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
              <p className="text-sm text-weavrn-muted leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
