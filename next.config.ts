import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle PDF parsing library for server-side
    if (isServer) {
      config.externals = config.externals || [];
      // Treat pdf-parse as external - will be required at runtime
      if (Array.isArray(config.externals)) {
        config.externals.push('pdf-parse');
      }
    }
    return config;
  },
};

export default nextConfig;
