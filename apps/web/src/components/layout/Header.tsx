import Link from 'next/link';

import { Button, Container } from '@omnia/ui';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-heading text-xl font-bold text-primary">
          Omnia Platform
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#ecossistema" className="text-sm text-muted-foreground hover:text-foreground">
            Ecossistema
          </Link>
          <Link href="#empresas" className="text-sm text-muted-foreground hover:text-foreground">
            Empresas
          </Link>
        </nav>
        <Button asChild size="sm">
          <a href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'}>Área Admin</a>
        </Button>
      </Container>
    </header>
  );
}
