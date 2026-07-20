import Link from 'next/link';

import { Container } from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';

import { ProfileForm } from './ProfileForm';

export const metadata = {
  title: 'Meu perfil',
  description: 'Edite seus dados pessoais na Omnia.',
};

export default async function MeuPerfilPage() {
  const user = await requirePortalSession('/meu-perfil');

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue">
            Meu perfil
          </h1>
          <p className="text-sm text-omnia-graphite-light">
            <Link href="/meu-perfil/senha" className="text-omnia-deep-blue hover:underline">
              Trocar senha
            </Link>
            {' · '}
            <Link href="/meu-perfil/organizacao" className="text-omnia-deep-blue hover:underline">
              Organização
            </Link>
          </p>
        </header>

        <ProfileForm user={user} />
      </div>
    </Container>
  );
}
