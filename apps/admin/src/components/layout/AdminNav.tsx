import Link from 'next/link';

import { cn } from '@omnia/ui';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/admin', label: 'Payload CMS', icon: '⚙️', external: false },
];

export function AdminNav() {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <div className="my-4 border-t" />
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Atalhos CMS
      </p>
      {[
        { href: '/admin/collections/companies', label: 'Empresas' },
        { href: '/admin/collections/tenants', label: 'Tenants' },
        { href: '/admin/collections/media', label: 'Mídia' },
        { href: '/admin/globals/global-settings', label: 'Configurações' },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
