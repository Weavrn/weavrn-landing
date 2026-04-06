"use client";

import ReactMarkdown from "react-markdown";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * SafeMarkdown component that sanitizes content before rendering
 * Prevents XSS attacks through markdown injection
 */
export default function SafeMarkdown({ content, className = "" }: SafeMarkdownProps) {
  // Basic sanitization: remove potentially dangerous patterns
  const sanitized = sanitizeMarkdown(content);

  return (
    <ReactMarkdown
      className={className}
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
      allowedAttributes={{
        a: ["href", "title"],
        code: ["className"],
      }}
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
            <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>
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
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        a({ href, children, title }) {
          // Validate href to prevent javascript: and data: URLs
          const safeHref = isSafeUrl(href) ? href : "#";
          return (
            <a
              href={safeHref}
              title={title}
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
        thead({ children }) {
          return <thead>{children}</thead>;
        },
        tbody({ children }) {
          return <tbody>{children}</tbody>;
        },
        tr({ children }) {
          return <tr>{children}</tr>;
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
  );
}

/**
 * Sanitize markdown content to prevent XSS
 * Removes or escapes potentially dangerous patterns
 */
function sanitizeMarkdown(content: string): string {
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, "");

  // Remove javascript: protocol URLs
  sanitized = sanitized.replace(/\[([^\]]+)\]\(javascript:[^)]*\)/gi, "[$1](#)");

  // Remove data: protocol URLs
  sanitized = sanitized.replace(/\[([^\]]+)\]\(data:[^)]*\)/gi, "[$1](#)");

  // Remove vbscript: protocol URLs
  sanitized = sanitized.replace(/\[([^\]]+)\]\(vbscript:[^)]*\)/gi, "[$1](#)");

  // Remove on* event handlers in markdown (if someone tries to inject them)
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");

  return sanitized;
}

/**
 * Check if a URL is safe to navigate to
 * Prevents javascript:, data:, and vbscript: URLs
 */
function isSafeUrl(url?: string): boolean {
  if (!url) return false;

  try {
    // Check for dangerous protocols
    if (
      url.startsWith("javascript:") ||
      url.startsWith("data:") ||
      url.startsWith("vbscript:")
    ) {
      return false;
    }

    // Allow relative URLs and http(s)
    if (url.startsWith("/") || url.startsWith("#")) {
      return true;
    }

    // Validate absolute URLs
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    // Invalid URL format
    return false;
  }
}
