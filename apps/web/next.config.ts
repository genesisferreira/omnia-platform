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
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'www.omniafrigo.com.br' }],
        destination: 'https://omniafrigo.com.br/',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.omniafrigo.com.br' }],
        destination: 'https://omniafrigo.com.br/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
