import { Button } from '@omnia/ui';
import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Omnia Platform</h1>
        <p className="mt-4 text-lg text-muted-foreground">Admin em construção</p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/admin">Abrir Payload CMS</Link>
        </Button>
        <Button variant="outline" disabled>
          Sprint 1 — Base executável
        </Button>
      </div>
    </main>
  );
}
