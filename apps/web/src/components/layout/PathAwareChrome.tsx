'use client';

import { usePathname } from 'next/navigation';

import { AiDock } from '@/components/ai/AiDock';
import { AiExperienceProvider } from '@/components/ai/AiExperienceProvider';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

function isAcademicShell(pathname: string): boolean {
  return (
    pathname === '/lms' ||
    pathname.startsWith('/lms/') ||
    pathname === '/aluno' ||
    pathname.startsWith('/aluno/') ||
    pathname === '/professor' ||
    pathname.startsWith('/professor/')
  );
}

/**
 * Esconde chrome institucional nas rotas /lms, /aluno e /professor (shell próprio).
 */
export function PathAwareChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isLms = isAcademicShell(pathname);

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
  if (!isAcademicShell(pathname)) return null;
  // FPA-006: aula nativa já tem TutorPanel contextual — não duplicar AiDock
  if (/^\/aluno\/cursos\/[^/]+\/aula\//.test(pathname)) return null;
  if (pathname.startsWith('/aluno/onboarding')) return null;
  return <AiDock />;
}
