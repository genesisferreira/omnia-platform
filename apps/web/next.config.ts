import type { NextConfig } from 'next';

const adminOrigin = (process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, '');

/**
 * HSTS sem includeSubDomains/preload: os subdomínios do domínio ainda não foram todos mapeados.
 * Prazo inicial curto; aumentar após observação em produção.
 * A CSP fica em Report-Only até ser validada com Next, imagens do Admin e formulários.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=86400' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${adminOrigin}`.trim(),
      `connect-src 'self' ${adminOrigin}`.trim(),
      "font-src 'self' data:",
      `media-src 'self' blob: ${adminOrigin}`.trim(),
      `frame-src 'self' ${adminOrigin} https://www.youtube.com https://player.vimeo.com`.trim(),
      `form-action 'self' ${adminOrigin}`.trim(),
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
        source: '/empresas/cte',
        destination: '/empresas/tecmova',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
