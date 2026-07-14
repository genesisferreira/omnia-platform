import Link from 'next/link';

import { AdminNav } from './AdminNav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="border-b p-4">
          <Link href="/" className="font-heading text-lg font-bold text-primary">
            Omnia Admin
          </Link>
          <p className="text-xs text-muted-foreground">Painel administrativo</p>
        </div>
        <AdminNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="md:hidden">
            <Link href="/" className="font-heading font-bold text-primary">
              Omnia Admin
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              Payload CMS →
            </Link>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
