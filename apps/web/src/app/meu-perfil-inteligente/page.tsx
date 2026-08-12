import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@omnia/ui';

import { SipProfilePanel } from '@/components/sip/SipProfilePanel';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchPublicCourses } from '@/lib/cms-lms-core';

export const metadata = {
  title: 'Meu Perfil Inteligente',
  description: 'Competências, evolução e recomendações do Student Intelligence Platform.',
};

type PageProps = {
  searchParams: Promise<{ courseId?: string; course?: string }>;
};

export default async function MeuPerfilInteligentePage({ searchParams }: PageProps) {
  await requirePortalSession('/meu-perfil-inteligente');
  const sp = await searchParams;

  const courses = await fetchPublicCourses();
  const list = courses.items || [];
  const selected =
    list.find((c) => String(c.id) === String(sp.courseId || sp.course || '')) || list[0];

  if (!selected) {
    return (
      <Container className="py-12 md:py-16">
        <h1 className="font-heading text-3xl font-bold text-omnia-deep-blue">
          Meu Perfil Inteligente
        </h1>
        <p className="mt-4 text-sm text-omnia-graphite-light">
          Nenhum curso disponível. Explore a{' '}
          <Link href="/cursos" className="underline">
            catálogo de cursos
          </Link>
          .
        </p>
      </Container>
    );
  }

  if (!selected.id) notFound();

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/meu-perfil" className="underline">
              Meu perfil
            </Link>
            {' · '}
            <Link href="/cursos" className="underline">
              Cursos
            </Link>
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue">
            Meu Perfil Inteligente
          </h1>
          <p className="text-sm text-omnia-graphite-light">
            Gêmeo digital educacional construído automaticamente a partir das suas evidências de
            aprendizagem — curso: <strong>{selected.title}</strong>
          </p>
          {list.length > 1 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {list.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  href={`/meu-perfil-inteligente?courseId=${c.id}`}
                  className={`rounded border px-3 py-1 text-xs ${
                    String(c.id) === String(selected.id)
                      ? 'border-omnia-deep-blue bg-omnia-deep-blue text-white'
                      : 'border-border'
                  }`}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <SipProfilePanel courseId={String(selected.id)} />
      </div>
    </Container>
  );
}
