import { SOCIAL_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
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
        </div>
      </div>
    </footer>
  );
}
