import type { Metadata } from 'next';

import '@omnia/ui/globals.css';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getSiteContext } from '@/lib/site-context';

export const metadata: Metadata = {
  title: 'Omnia Platform',
  description: 'Ecossistema digital da Omnia Frigo Holding',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteRequestContext = await getSiteContext();
  const { hostname, resolution } = siteRequestContext;

  return (
    <html
      lang="pt-BR"
      data-site-resolution={resolution.ok ? 'resolved' : resolution.status}
      data-site-hostname={resolution.ok ? resolution.context.hostname : hostname}
      data-site-slug={resolution.ok ? resolution.context.site.slug : undefined}
      data-company-slug={resolution.ok ? (resolution.context.company?.slug ?? '') : undefined}
      data-tenant-slug={resolution.ok ? resolution.context.tenant.slug : undefined}
      data-site-error-code={resolution.ok ? undefined : resolution.error.code}
    >
      <body className="font-sans antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
