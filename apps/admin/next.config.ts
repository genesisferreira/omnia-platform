import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

/**
 * HSTS sem includeSubDomains/preload: os subdomínios do domínio ainda não foram todos mapeados.
 * A CSP fica em Report-Only até ser validada com o Admin do Payload.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=86400' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "font-src 'self' data:",
      `frame-ancestors 'self' ${appOrigin}`.trim(),
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

/**
 * Só o painel e o login ficam proibidos de ser embutidos por outra origem: os arquivos de
 * mídia (ex.: PDFs de aula) são exibidos em iframe pelo Portal, que é outra origem.
 */
const panelFrameHeaders = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' as const } : {}),
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin', headers: panelFrameHeaders },
      { source: '/admin/:path*', headers: panelFrameHeaders },
      { source: '/login', headers: panelFrameHeaders },
    ];
  },
  transpilePackages: ['@omnia/ui', '@omnia/database', '@omnia/monitoring'],
  reactStrictMode: true,
  // Quality job already runs `next lint`. Do not fail `next build` on lint again.
  eslint: { ignoreDuringBuilds: true },
};

export default withPayload(nextConfig);
