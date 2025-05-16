import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'raw.githubusercontent.com',
      },
      {
        hostname: 'coin-images.coingecko.com',
      },
      {
        hostname: 'swap.kittypunch.xyz',
      }
    ],
  },
};

export default nextConfig;
