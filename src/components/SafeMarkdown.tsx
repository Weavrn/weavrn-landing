/**
 * Safe Markdown Component
 * Renders markdown with XSS protection
 */

import ReactMarkdown from "react-markdown";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Sanitizes markdown content to prevent XSS
 * Removes potentially dangerous HTML/scripts
 */
function sanitizeMarkdown(content: string): string {
  // Remove script tags and their content
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  return sanitized;
}

export default function SafeMarkdown({
  content,
  className = "",
}: SafeMarkdownProps) {
  const sanitized = sanitizeMarkdown(content);

  return (
    <div className={className}>
      <ReactMarkdown
        allowedElements={[
          "p",
          "code",
          "pre",
          "ul",
          "ol",
          "li",
          "h1",
          "h2",
          "h3",
          "strong",
          "em",
          "a",
          "hr",
          "blockquote",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "br",
        ]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-black/40 rounded p-2 my-1 overflow-x-auto">
                  <code
                    className="text-[10px] font-mono text-green-300"
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="bg-black/30 px-1 rounded text-[10px] font-mono text-weavrn-accent"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-1.5 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li>{children}</li>;
          },
          h1({ children }) {
            return <p className="font-bold text-white mb-1">{children}</p>;
          },
          h2({ children }) {
            return <p className="font-bold text-white mb-1">{children}</p>;
          },
          h3({ children }) {
            return <p className="font-semibold text-white mb-1">{children}</p>;
          },
          strong({ children }) {
            return (
              <strong className="text-white font-semibold">{children}</strong>
            );
          },
          a({ href, children }) {
            // Sanitize href to prevent javascript: and data: URIs
            const safeHref =
              href && (href.startsWith("http://") || href.startsWith("https://"))
                ? href
                : "#";

            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-weavrn-accent hover:underline"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="border-weavrn-border/30 my-2" />;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-weavrn-accent/30 pl-2 italic opacity-80">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <table className="text-[10px] w-full my-1">{children}</table>
            );
          },
          th({ children }) {
            return (
              <th className="text-left font-semibold pb-1 pr-2 border-b border-weavrn-border/30">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="py-0.5 pr-2">{children}</td>;
          },
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}
