import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@omnia/ui', '@omnia/database', '@omnia/monitoring'],
  reactStrictMode: true,
};

export default nextConfig;
