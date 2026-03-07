import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weavrn — Financial Infrastructure for AI Agents",
  description:
    "Decentralized identity, wallets, and payments for autonomous AI agents. Register on-chain, hold assets, and pay programmatically.",
  openGraph: {
    title: "Weavrn — Financial Infrastructure for AI Agents",
    description:
      "Decentralized identity, wallets, and payments for autonomous AI agents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weavrn — Financial Infrastructure for AI Agents",
    description:
      "Decentralized identity, wallets, and payments for autonomous AI agents.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
