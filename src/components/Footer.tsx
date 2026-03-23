import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
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
                    className="text-sm text-weavrn-muted hover:text-[#00D4AA] transition-colors font-mono lowercase"
                  >
                    {name}
                  </a>
                )
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-weavrn-muted hover:text-[#00D4AA] transition-colors font-mono lowercase"
            >
              contact
            </a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-weavrn-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-6">
            {["Terms", "Privacy", "Disclaimer"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-weavrn-muted/60 hover:text-weavrn-muted transition-colors font-mono"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-xs text-weavrn-muted/40 text-center sm:text-right max-w-md">
            WVRN is a utility token. Nothing on this site constitutes financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
