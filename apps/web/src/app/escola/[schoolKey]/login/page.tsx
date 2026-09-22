import Link from 'next/link';
import { notFound } from 'next/navigation';

import { parseSchoolKeyParam, SCHOOL_BRANDS } from '@omnia/intelligent-learning';
import { Button } from '@omnia/ui';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

type PageProps = {
  params: Promise<{ schoolKey: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolLoginPage({ params, searchParams }: PageProps) {
  const { schoolKey: raw } = await params;
  const key = parseSchoolKeyParam(raw);
  if (!key) notFound();
  const brand = SCHOOL_BRANDS[key];
  const qs = (await searchParams) || {};
  const rawNext = qs.next;
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  const studentNext =
    typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/aluno';
  const professorNext = '/professor';

  return (
    <main
      className={`flex min-h-screen items-center justify-center px-4 py-10 ${brand.colors.surface}`}
      data-school-key={key}
      data-brand-placeholder={brand.placeholder ? 'true' : 'false'}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div
          className={`px-6 py-8 text-white ${brand.theme === 'fred' ? 'bg-emerald-800' : 'bg-slate-900'}`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Entrada escolar</p>
          <div className="mt-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">
            {brand.logoLabel}
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold">{brand.name}</h1>
          <p className="mt-2 text-sm text-white/80">
            Você está entrando no ambiente {brand.name}. O LMS Core é compartilhado; a identidade
            visual e o catálogo permanecem isolados por escola.
          </p>
          {brand.placeholder ? (
            <p className="mt-3 rounded-md bg-white/10 px-3 py-2 text-xs">
              CTE STAGING BRAND PLACEHOLDER · placeholder=true · assets oficiais ainda não
              homologados.
            </p>
          ) : null}
        </div>
        <div className="space-y-3 p-6">
          <Button asChild className="min-h-11 w-full">
            <a href={getAdminLoginUrl(studentNext)}>Entrar como aluno {brand.shortName}</a>
          </Button>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <a href={getAdminLoginUrl(professorNext)}>Entrar como professor {brand.shortName}</a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Mesmo host do portal Omnia. A escola é selecionada por esta rota e pelo contexto
            autenticado (BrandContext / schoolKey).
          </p>
          <p className="text-center text-xs">
            <Link href="/escola/fred-do-frio/login" className="underline">
              Fred do Frio
            </Link>
            {' · '}
            <Link href="/escola/cte/login" className="underline">
              CTE
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
