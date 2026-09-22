import Link from 'next/link';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@omnia/ui';

export const metadata = {
  title: 'Acesso não autorizado — Omnia Platform',
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Acesso não autorizado</CardTitle>
          <CardDescription>
            Sua conta não possui permissão para o painel administrativo global.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Ir para o login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/api/auth/logout">Sair</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
