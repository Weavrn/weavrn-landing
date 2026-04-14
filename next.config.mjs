/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
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
