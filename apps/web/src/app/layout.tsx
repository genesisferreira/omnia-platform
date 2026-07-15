import { Inter, Montserrat } from 'next/font/google';
import type { Metadata } from 'next';

import '@omnia/ui/globals.css';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { getSiteContext } from '@/lib/site-context';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Omnia Frigo Holding',
  description: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
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
      className={`${inter.variable} ${montserrat.variable}`}
    >
      <body className="font-sans antialiased">
        <SkipLink />
        <Header />
        <main id="conteudo-principal">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
