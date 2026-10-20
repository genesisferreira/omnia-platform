'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { schoolBrand } from '@omnia/intelligent-learning';
import { Button, cn } from '@omnia/ui';

import { BrandBanner, BrandMark } from '@/components/academic/BrandContext';
import { useOptionalAiExperience } from '@/components/ai/AiExperienceProvider';

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
  { href: '/professor/rascunhos', label: 'Meus rascunhos' },
  { href: '/professor/conteudo', label: 'Conteúdo' },
  { href: '/professor/aulas-ao-vivo', label: 'Aulas ao vivo' },
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
  const ai = useOptionalAiExperience();
  const nav = props.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const home = props.role === 'teacher' ? '/professor' : '/aluno';
  const brand = schoolBrand(props.schoolKey);
  const schoolLabel = props.schoolName || brand?.name || 'Escola';
  const assistantLabel = brand
    ? props.role === 'teacher'
      ? `Assistente ${brand.shortName}`
      : `Tutor ${brand.shortName}`
    : 'Assistente';
  const sidebarClass = brand
    ? brand.theme === 'fred'
      ? 'bg-emerald-900 text-white'
      : 'bg-slate-900 text-white'
    : 'bg-lms-sidebar text-lms-sidebar-foreground';

  return (
    <div
      className="flex min-h-screen overflow-x-hidden bg-lms-surface text-foreground"
      data-school-key={props.schoolKey || ''}
      data-brand-placeholder={brand?.placeholder ? 'true' : 'false'}
      data-lms-native="true"
    >
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform lg:static lg:translate-x-0',
          sidebarClass,
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <Link href={home} className="block" aria-label={`${schoolLabel} — início`}>
            <BrandMark schoolKey={props.schoolKey} />
            <span className="mt-2 block text-sm text-white/80">
              {schoolLabel} · {props.role === 'teacher' ? 'professor' : 'aluno'}
            </span>
          </Link>
          <p className="mt-1 truncate text-xs text-white/70">{props.userName}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação acadêmica">
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
                  'block min-h-11 rounded-md px-3 py-2 text-sm font-medium',
                  active ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3 text-xs text-white/70">
          <button
            type="button"
            className="block w-full min-h-11 rounded-md bg-white/10 px-3 py-2 text-left font-medium text-white hover:bg-white/15"
            onClick={() => {
              setOpen(false);
              ai?.setOpen(true);
            }}
          >
            {assistantLabel}
          </button>
          <Link
            href="/minha-conta"
            className="block px-1 hover:underline"
            onClick={() => setOpen(false)}
          >
            Minha conta
          </Link>
          <p className="px-1 text-[10px] text-white/40">Tecnologia Omnia</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => setOpen(true)}
          >
            Menu
          </Button>
          <BrandMark schoolKey={props.schoolKey} compact className="min-w-0" />
        </header>
        <main id="conteudo-academico" className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">
          <BrandBanner
            schoolKey={props.schoolKey}
            area={props.role === 'teacher' ? 'professor' : 'aluno'}
          />
          {props.children}
        </main>
      </div>
    </div>
  );
}
