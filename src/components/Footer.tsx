import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-weavrn-muted font-mono">
            weavrn {new Date().getFullYear()}
          </div>
          <nav className="flex gap-8" aria-label="Social media links">
            {Object.entries(SOCIAL_LINKS).map(
              ([name, url]) =>
                url && (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
                    aria-label={`Visit Weavrn on ${name}`}
                  >
                    {name}
                  </a>
                )
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
              aria-label="Contact Weavrn via email"
            >
              contact
            </a>
          </nav>
        </div>
        <div className="mt-6 pt-6 border-t border-weavrn-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
          <nav className="flex gap-6" aria-label="Legal links">
            <a href="/terms" className="text-xs text-weavrn-muted/60 hover:text-weavrn-muted transition-colors font-mono">Terms</a>
            <a href="/privacy" className="text-xs text-weavrn-muted/60 hover:text-weavrn-muted transition-colors font-mono">Privacy</a>
          </nav>
          <p className="text-xs text-weavrn-muted/40 text-center sm:text-right max-w-md">
            WVRN is a utility token. Nothing on this site constitutes financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
