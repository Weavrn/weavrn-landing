"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { JsonRpcSigner } from "ethers";
import WalletConnect from "./WalletConnect";

interface Props {
  onConnect?: (addr: string, signer: JsonRpcSigner) => void;
  onDisconnect?: () => void;
  address?: string | null;
  showWallet?: boolean;
}

const NAV_LINKS = [
  { label: "Agents", href: "/agents" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mining", href: "/mine" },
];

export default function AppHeader({ onConnect, onDisconnect, address, showWallet = true }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-weavrn-border/50 px-6 py-4 backdrop-blur-sm bg-weavrn-dark/80">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="w-7 h-7" />
          <span className="text-xl font-bold gradient-text">weavrn</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-weavrn-accent"
                  : "text-weavrn-muted hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
          {showWallet && onConnect && onDisconnect && (
            <WalletConnect onConnect={onConnect} onDisconnect={onDisconnect} address={address ?? null} />
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-3">
          {showWallet && onConnect && onDisconnect && (
            <WalletConnect onConnect={onConnect} onDisconnect={onDisconnect} address={address ?? null} />
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-weavrn-muted hover:text-white transition-colors p-1"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {menuOpen ? (
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-weavrn-dark/95 backdrop-blur-xl border-b border-weavrn-border/50 px-6 pb-4 mt-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm transition-colors ${
                pathname === link.href
                  ? "text-weavrn-accent"
                  : "text-weavrn-muted hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
