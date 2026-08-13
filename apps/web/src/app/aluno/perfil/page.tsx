import Link from 'next/link';
import { Button } from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoPerfilPage() {
  const user = await requirePortalSession('/aluno/perfil');
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Perfil</h1>
      <p className="text-sm">{user.name || user.email}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/meu-perfil">Editar perfil</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/aluno/inteligencia">Acompanhamento 360</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/meu-perfil-inteligente">Perfil inteligente (SIP)</Link>
        </Button>
      </div>
    </div>
  );
}
