import RewardsCalculator from "./RewardsCalculator";

export default function Mining() {
  const steps = [
    {
      step: "01",
      title: "Post",
      description:
        "Create content about AI agents and the Weavrn ecosystem on X. Up to 3 submissions per day.",
    },
    {
      step: "02",
      title: "Submit",
      description:
        "Submit your tweet link through the mining dashboard. We pull engagement metrics automatically.",
    },
    {
      step: "03",
      title: "Score",
      description:
        "Your post is scored based on real engagement — likes, retweets, replies, and views. Higher quality content earns more.",
    },
    {
      step: "04",
      title: "Earn",
      description:
        "Approved submissions earn WVRN tokens from the daily emission pool (50K WVRN at launch, halving every 90 days). Claim directly to your wallet.",
    },
  ];

  return (
    <section id="mining" className="relative py-32 px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Social Mining
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Earn WVRN by spreading the word
          </h2>
          <p className="text-weavrn-muted mt-4 max-w-xl mx-auto">
            No staking, no lock-ups. Post about the agent economy on X and earn
            tokens based on real engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-16">
          {steps.map((s, i) => (
            <div key={s.step} className="relative text-center md:text-left">
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

        <RewardsCalculator />
      </div>
    </section>
  );
}
