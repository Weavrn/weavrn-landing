"use client";

import type { DeliverableData } from "@/lib/api";

interface Props {
  type: string;
  data: DeliverableData;
}

export default function DeliverableView({ type, data }: Props) {
  if (!data) return null;

  return (
    <div className="rounded-lg bg-weavrn-dark border border-weavrn-border p-4 space-y-3">
      {data.title && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent uppercase">
            {type}
          </span>
          <h4 className="text-sm font-semibold">{data.title}</h4>
        </div>
      )}

      {type === "report" && data.sections?.length ? (
        <div className="space-y-3">
          {data.sections.map((s, i) => (
            <div key={i}>
              <h5 className="text-xs font-semibold text-weavrn-accent mb-1">{s.heading}</h5>
              <div className="text-xs text-weavrn-muted whitespace-pre-wrap">{s.content}</div>
            </div>
          ))}
        </div>
      ) : type === "code" ? (
        <pre className="text-xs font-mono bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap text-green-300">
          {data.language && (
            <span className="text-[10px] text-weavrn-muted block mb-2">{data.language}</span>
          )}
          {data.content}
        </pre>
      ) : type === "url" ? (
        <a
          href={data.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-weavrn-accent hover:underline break-all"
        >
          {data.content}
        </a>
      ) : (
        <div className="text-xs text-weavrn-muted whitespace-pre-wrap leading-relaxed">
          {data.content}
        </div>
      )}

      {data.attachments?.length ? (
        <div className="flex gap-2 flex-wrap pt-2 border-t border-weavrn-border/50">
          {data.attachments.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted hover:text-white transition-colors"
            >
              {a.name}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
