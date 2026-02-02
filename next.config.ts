import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Dawn-Of-Man',
  assetPrefix: '/Dawn-Of-Man/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
