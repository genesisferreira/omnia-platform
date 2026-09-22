import type { Metadata } from 'next';
import Link from 'next/link';

import { Button, Container } from '@omnia/ui';

import { buildNotFoundMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNotFoundMetadata();

export default function NotFound() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper">404</p>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue md:text-4xl">
        Página não encontrada
      </h1>
      <p className="max-w-md text-base text-omnia-graphite-light">
        O endereço solicitado não existe ou ainda não foi publicado.
      </p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </Container>
  );
}
