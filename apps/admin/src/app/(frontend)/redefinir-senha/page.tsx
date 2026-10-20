import { Suspense } from 'react';

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Redefinir senha — Omnia Platform',
  description: 'Defina uma nova senha para a plataforma Omnia',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
