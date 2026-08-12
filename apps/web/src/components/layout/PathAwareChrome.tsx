'use client';

import { usePathname } from 'next/navigation';

import { AiDock } from '@/components/ai/AiDock';
import { AiExperienceProvider } from '@/components/ai/AiExperienceProvider';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

/**
 * Esconde chrome institucional nas rotas /lms/* (shell LMS próprio).
 * Mantém AI Dock global nas áreas autenticadas (inclui LMS via provider no root).
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
      <AiDock />
    </>
  );
}

export function PortalAiShell({ children }: { children: React.ReactNode }) {
  return (
    <AiExperienceProvider>
      <PathAwareChrome>{children}</PathAwareChrome>
      {/* LMS layout hides institutional chrome but still mounts dock via Lms path */}
      <LmsAwareDock />
    </AiExperienceProvider>
  );
}

function LmsAwareDock() {
  const pathname = usePathname() || '';
  const isLms = pathname === '/lms' || pathname.startsWith('/lms/');
  if (!isLms) return null;
  return <AiDock />;
}
