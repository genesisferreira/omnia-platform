import type { Metadata } from 'next';

import { Container } from '@omnia/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Minhas cotações', template: '%s | Minhas cotações' },
  robots: { index: false, follow: false, nocache: true },
};

export default function MinhasCotacoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-4xl">{children}</div>
    </Container>
  );
}
