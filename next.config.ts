import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mcc-dev.vectorxdb.ai',
        pathname: '/**', // allow any path under this host
      },
    ],
  },
};

export default nextConfig;
