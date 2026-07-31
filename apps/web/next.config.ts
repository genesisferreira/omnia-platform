import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' as const } : {}),
  transpilePackages: [
    '@omnia/ui',
    '@omnia/database',
    '@omnia/monitoring',
    '@omnia/learning-engine',
    '@omnia/assessment-engine',
  ],
  reactStrictMode: true,
};

export default nextConfig;
