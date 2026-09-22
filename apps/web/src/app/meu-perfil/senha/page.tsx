import Link from 'next/link';

import { Container } from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';

import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata = {
  title: 'Trocar senha',
  description: 'Altere sua senha de acesso na Omnia.',
};

export default async function TrocarSenhaPage() {
  await requirePortalSession('/meu-perfil/senha');

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue">
            Trocar senha
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

        <ChangePasswordForm />
      </div>
    </Container>
  );
}
