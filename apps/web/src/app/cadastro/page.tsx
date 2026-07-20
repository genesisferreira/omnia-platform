import type { Metadata } from 'next';

import { Container } from '@omnia/ui';

import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Cadastro',
  description: 'Crie sua conta no ecossistema Omnia.',
};

export default function CadastroPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16">
      <RegisterForm />
    </Container>
  );
}
