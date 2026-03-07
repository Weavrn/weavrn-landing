import { SOCIAL_LINKS } from "@/lib/constants";
import Footer from "@/components/Footer";

export default function MinePage() {
  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      {/* Header */}
      <header className="relative z-20 border-b border-weavrn-border/50 px-6 py-4 backdrop-blur-sm bg-weavrn-dark/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="w-7 h-7" />
            <span className="text-xl font-bold gradient-text">weavrn</span>
          </a>
        </div>
      </header>

      {/* Coming Soon */}
      <div className="relative z-10 px-6 py-32 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-[#00D4AA]/30 bg-[#00D4AA]/5 text-sm text-[#00D4AA] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
            Coming Soon
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Social <span className="gradient-text">Mining</span>
          </h1>
          <p className="text-weavrn-muted max-w-md mx-auto mb-10">
            Post about AI agents and the Weavrn ecosystem on X. Earn WVRN
            tokens based on engagement. The mining dashboard is launching soon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,170,0.3)]"
            >
              Follow on X
            </a>
            <a
              href="/"
              className="px-8 py-3.5 border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg font-semibold transition-all duration-300 hover:bg-weavrn-surface"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
