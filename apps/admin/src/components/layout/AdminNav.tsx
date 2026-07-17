import Link from 'next/link';

import type { PlatformRole } from '@omnia/constants';
import { cn } from '@omnia/ui';

type NavItem = { href: string; label: string; roles?: PlatformRole[] };

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/admin', label: 'Payload CMS' },
];

const cmsShortcuts: NavItem[] = [
  {
    href: '/admin/collections/companies',
    label: 'Empresas',
    roles: ['super_admin', 'admin', 'editor'],
  },
  {
    href: '/admin/collections/tenants',
    label: 'Tenants',
    roles: ['super_admin', 'admin'],
  },
  {
    href: '/admin/collections/media',
    label: 'Mídia',
    roles: ['super_admin', 'admin', 'editor'],
  },
  {
    href: '/admin/collections/users',
    label: 'Usuários',
    roles: ['super_admin', 'admin'],
  },
  {
    href: '/admin/globals/global-settings',
    label: 'Configurações',
    roles: ['super_admin', 'admin'],
  },
];

function canSee(item: NavItem, role: PlatformRole | null): boolean {
  if (!item.roles) {
    return true;
  }
  return role != null && item.roles.includes(role);
}

export function AdminNav({ role }: { role: PlatformRole | null }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
      <div className="my-4 border-t" />
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Atalhos CMS
      </p>
      {cmsShortcuts
        .filter((item) => canSee(item, role))
        .map((item) => (
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
