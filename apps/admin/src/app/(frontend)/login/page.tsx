import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getScopedAreaPath } from '@omnia/constants';

import { LoginForm } from '@/components/auth/LoginForm';
import { getAuthSession } from '@/lib/auth';
import { hasStaffAccess, isScopedPortalRole } from '@/access/rbac';

export const metadata = {
  title: 'Entrar — Omnia Platform',
  description: 'Acesso autenticado à plataforma Omnia',
};

export default async function LoginPage() {
  const { user } = await getAuthSession();

  if (user?.role && hasStaffAccess(user)) {
    redirect('/');
  }

  if (user?.role && isScopedPortalRole(user.role)) {
    const area = getScopedAreaPath(user.role);
    if (area) {
      redirect(area);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
