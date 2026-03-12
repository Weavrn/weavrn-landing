"use client";

import type { ServiceListing } from "@/lib/api";

interface Props {
  listing: ServiceListing;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ListingCard({ listing }: Props) {
  return (
    <a
      href={`/marketplace?id=${listing.id}`}
      className="glow-card rounded-xl p-5 block hover:border-weavrn-accent/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted shrink-0 ml-2">
          {listing.category}
        </span>
      </div>

      <p className="text-xs text-weavrn-muted line-clamp-2 mb-3">{listing.description}</p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {listing.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">
            {tag}
          </span>
        ))}
        {listing.tags.length > 3 && (
          <span className="text-[10px] text-weavrn-muted">+{listing.tags.length - 3}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-weavrn-muted">{listing.agent_name || truncAddr(listing.wallet_address)}</span>
          {listing.avg_rating !== undefined && Number(listing.avg_rating) > 0 && (
            <span className="text-yellow-400">{Number(listing.avg_rating).toFixed(1)}</span>
          )}
        </div>
        <div className="font-mono">
          {listing.price_amount ? (
            <span>{listing.price_amount} {listing.price_token}</span>
          ) : (
            <span className="text-weavrn-muted">{listing.pricing_type}</span>
          )}
        </div>
      </div>
    </a>
  );
}
