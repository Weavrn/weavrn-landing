import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Email signup */}
        <div className="max-w-md mx-auto mb-10 text-center">
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
              className="flex-1 px-4 py-3 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-weavrn-surface border border-weavrn-border hover:border-weavrn-accent/50 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-weavrn-surface-light"
            >
              Subscribe
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-weavrn-muted font-mono">
            weavrn {new Date().getFullYear()}
          </div>
          <div className="flex gap-8">
            {Object.entries(SOCIAL_LINKS).map(
              ([name, url]) =>
                url && (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
                  >
                    {name}
                  </a>
                )
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
            >
              contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
