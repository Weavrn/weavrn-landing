import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import TestnetBanner from "@/components/TestnetBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weavrn — Financial Infrastructure for AI Agents",
  description:
    "Decentralized identity, wallets, and payments for autonomous AI agents. Register on-chain, hold assets, and pay programmatically.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://weavrn.com"),
  openGraph: {
    title: "Weavrn — Financial Infrastructure for AI Agents",
    description:
      "Decentralized identity, wallets, and payments for autonomous AI agents.",
    url: "https://weavrn.com",
    siteName: "Weavrn",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Weavrn — Financial Infrastructure for AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@weavrn",
    title: "Weavrn — Financial Infrastructure for AI Agents",
    description:
      "Decentralized identity, wallets, and payments for autonomous AI agents.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TestnetBanner />
        {children}
        {process.env.NEXT_PUBLIC_GOATCOUNTER_URL && (
          <Script
            data-goatcounter={`${process.env.NEXT_PUBLIC_GOATCOUNTER_URL}/count`}
            src={`${process.env.NEXT_PUBLIC_GOATCOUNTER_URL}/count.js`}
            strategy="afterInteractive"
          />
        )}
        <Script id="x-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','rbxny');
        `}</Script>
      </body>
    </html>
  );
}
