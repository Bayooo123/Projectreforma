import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error - Next.js types might be outdated
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
