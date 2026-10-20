'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@omnia/ui';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

type AccountNavProps = {
  className?: string;
};

export function AccountNav({ className }: AccountNavProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!cancelled) {
          setAuthenticated(response.ok);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authenticated === null) {
    return (
      <Button size="sm" variant="outline" className={className} disabled aria-hidden="true">
        …
      </Button>
    );
  }

  if (authenticated) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Button asChild size="sm" variant="outline">
          <Link href="/ia">Omnia AI</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/minha-conta">Minha conta</Link>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild size="sm" variant="outline" className={className}>
      <a href={getAdminLoginUrl('/ia')}>Entrar na plataforma</a>
    </Button>
  );
}
