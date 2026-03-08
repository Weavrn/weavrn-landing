import { ROADMAP_PHASES } from "@/lib/constants";

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative py-32 px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-[#00D4AA] text-sm font-mono font-medium tracking-wider uppercase mb-4">
            Roadmap
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            The path forward
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROADMAP_PHASES.map((phase, i) => (
            <div
              key={phase.phase}
              className={`glow-card rounded-2xl p-7 relative overflow-hidden ${
                i === 0 ? "border-[#00D4AA]/30" : ""
              }`}
            >
              {i === 0 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4AA]/50 to-transparent" />
              )}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-mono text-[#00D4AA] tracking-wider">
                  {phase.phase}
                </span>
                {i === 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-4">{phase.title}</h3>
              <ul className="space-y-3">
                {phase.items.map((item) => (
                  <li key={item} className="text-sm text-weavrn-muted flex gap-2.5">
                    <span className="text-[#00D4AA]/60 mt-1 flex-shrink-0">&#9656;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
