import Link from 'next/link';

import { Container } from '@omnia/ui';

import { fetchOrganizations } from '@/lib/auth/payload-client';
import { requirePortalSession } from '@/lib/auth/require-session';

import { OrganizationForm } from './OrganizationForm';

export const metadata = {
  title: 'Organização',
  description: 'Preferências de empresa e interesses no ecossistema Omnia.',
};

export default async function OrganizacaoPage() {
  const user = await requirePortalSession('/meu-perfil/organizacao');
  const organizations = await fetchOrganizations();

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue">
            Organização
          </h1>
          <p className="text-sm text-omnia-graphite-light">
            <Link href="/meu-perfil" className="text-omnia-deep-blue hover:underline">
              Meu perfil
            </Link>
            {' · '}
            <Link href="/minha-conta" className="text-omnia-deep-blue hover:underline">
              Minha conta
            </Link>
          </p>
        </header>

        <OrganizationForm user={user} organizations={organizations} />
      </div>
    </Container>
  );
}
