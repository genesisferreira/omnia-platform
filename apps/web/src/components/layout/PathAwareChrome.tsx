'use client';

import { usePathname } from 'next/navigation';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

/**
 * Esconde chrome institucional nas rotas /lms/* (shell LMS próprio).
 */
export function PathAwareChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isLms = pathname === '/lms' || pathname.startsWith('/lms/');

  if (isLms) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="conteudo-principal" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
