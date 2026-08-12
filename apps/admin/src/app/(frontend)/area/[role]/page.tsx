import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PLATFORM_ROLE_LABELS, isScopedPortalRole, type ScopedPortalRole } from '@omnia/constants';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@omnia/ui';

import { getAuthSession } from '@/lib/auth';

type AreaPageProps = {
  params: Promise<{ role: string }>;
};

export default async function ScopedAreaPage({ params }: AreaPageProps) {
  const { role: rawRole } = await params;
  if (!isScopedPortalRole(rawRole)) {
    notFound();
  }
  const role = rawRole as ScopedPortalRole;

  const { user } = await getAuthSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/area/${role}`)}`);
  }
  if (user.role !== role) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Área {PLATFORM_ROLE_LABELS[role]}</CardTitle>
          <CardDescription>
            Esta área própria será disponibilizada em uma sprint futura. O painel administrativo
            global permanece bloqueado para este papel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/api/auth/logout">Sair</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
