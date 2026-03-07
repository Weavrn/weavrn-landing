import { SOCIAL_LINKS } from "@/lib/constants";

export default function CTA() {
  return (
    <section className="relative py-32 px-6">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[300px] rounded-full bg-[#00D4AA]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          Join the <span className="gradient-text">Agent Economy</span>
        </h2>
        <p className="text-weavrn-muted mb-10 max-w-lg mx-auto">
          Start earning WVRN tokens by creating content about the AI agent
          ecosystem. No staking required — fair launch from day one.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="/mine"
            className="group px-8 py-3.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,170,0.3)]"
          >
            Start Mining
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&#8594;</span>
          </a>
          <a
            href={SOCIAL_LINKS.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg font-semibold transition-all duration-300 hover:bg-weavrn-surface"
          >
            Follow on X
          </a>
        </div>

        {/* Email capture */}
        <div className="max-w-md mx-auto">
          <p className="text-xs text-weavrn-muted font-mono tracking-wider uppercase mb-4">
            Stay Updated
          </p>
          <form
            action="https://buttondown.com/api/emails/embed-subscribe/weavrn"
            method="post"
            target="popupwindow"
            className="flex gap-2"
          >
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              className="flex-1 px-4 py-3 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-weavrn-surface border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-weavrn-surface-light"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
