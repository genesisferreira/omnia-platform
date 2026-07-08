import { Button } from '@omnia/ui';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Omnia Platform</h1>
        <p className="mt-4 text-lg text-muted-foreground">Portal em construção</p>
      </div>
      <Button variant="outline" disabled>
        Sprint 1 — Base executável
      </Button>
    </main>
  );
}
