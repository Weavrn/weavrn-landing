/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `output: "export"` was removed when the MCP tool detail route
  // (`/tools/[provider]/[slug]`) landed — provider/slug tuples are created
  // by the marketplace at runtime, so they can't be enumerated via
  // `generateStaticParams()` at build time. Every page in this app is
  // already wallet-connected and API-driven, so static export bought
  // nothing beyond a deployment-shape convenience. Vercel auto-detects
  // Next.js and serves this as a standard Next app without the flag.
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // @weavrn/sdk's main index re-exports a small git-helpers module that
    // pulls in Node built-ins (`fs`, `child_process`). The landing uses only
    // the browser-safe parts of the SDK (WeavrnClient + tool modules); stub
    // the Node modules in the client bundle so webpack can tree-shake the
    // git helpers without a resolution error.
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
