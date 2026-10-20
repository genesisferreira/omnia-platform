import Link from 'next/link';

import { AdminNav } from './AdminNav';
import type { SessionUser } from '@/lib/auth';

export function AdminShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="border-b p-4">
          <Link href="/" className="font-heading text-lg font-bold text-primary">
            Omnia Admin
          </Link>
          <p className="text-xs text-muted-foreground">Painel administrativo</p>
        </div>
        <AdminNav role={user.role} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="md:hidden">
            <Link href="/" className="font-heading font-bold text-primary">
              Omnia Admin
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email ?? user.name}
            </span>
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              Payload CMS →
            </Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
