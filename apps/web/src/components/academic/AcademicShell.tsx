'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button, cn } from '@omnia/ui';

const STUDENT_NAV = [
  { href: '/aluno', label: 'Dashboard', exact: true },
  { href: '/aluno/cursos', label: 'Meus cursos' },
  { href: '/aluno/avaliacoes', label: 'Avaliações' },
  { href: '/aluno/notas', label: 'Notas' },
  { href: '/aluno/certificados', label: 'Certificados' },
  { href: '/aluno/calendario', label: 'Calendário' },
  { href: '/aluno/inteligencia', label: 'Acompanhamento' },
  { href: '/aluno/perfil', label: 'Perfil' },
];

const TEACHER_NAV = [
  { href: '/professor', label: 'Dashboard', exact: true },
  { href: '/professor/cursos', label: 'Meus cursos' },
  { href: '/professor/conteudo', label: 'Conteúdo' },
  { href: '/professor/turmas', label: 'Turmas' },
  { href: '/professor/alunos', label: 'Alunos' },
  { href: '/professor/avaliacoes', label: 'Avaliações' },
  { href: '/professor/questoes', label: 'Banco de questões' },
  { href: '/professor/notas', label: 'Correção' },
  { href: '/professor/progresso', label: 'Progresso' },
  { href: '/professor/inteligencia', label: 'Turma' },
  { href: '/professor/relatorios', label: 'Relatórios' },
  { href: '/professor/calendario', label: 'Calendário' },
];

export function AcademicShell(props: {
  role: 'student' | 'teacher';
  userName: string;
  schoolName?: string | null;
  schoolKey?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/aluno';
  const [open, setOpen] = useState(false);
  const nav = props.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const home = props.role === 'teacher' ? '/professor' : '/aluno';

  return (
    <div className="flex min-h-screen bg-lms-surface text-foreground">
      <a
        href="#conteudo-academico"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-lms-sidebar text-lms-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <Link href={home} className="font-heading text-lg font-bold tracking-tight">
            {props.schoolName || 'Omnia'} {props.role === 'teacher' ? 'Professor' : 'Aluno'}
          </Link>
          <p className="mt-1 truncate text-xs text-white/70">{props.userName}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Navegação acadêmica">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium',
                  active
                    ? 'bg-white/10 text-lms-sidebar-foreground'
                    : 'text-lms-sidebar-foreground/80 hover:bg-white/5',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-white/60">
          <Link href="/ia" className="hover:underline">
            Tutor IA
          </Link>
          {' · '}
          <Link href="/lms" className="hover:underline">
            LMS Moodle
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Menu
          </Button>
          <span className="text-sm font-medium">{props.userName}</span>
        </header>
        <main id="conteudo-academico" className="flex-1 p-4 md:p-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
