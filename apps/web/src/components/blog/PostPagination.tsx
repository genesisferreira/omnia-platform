import Link from 'next/link';

type PostPaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  page: number,
  searchParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value === undefined || value === '') {
        continue;
      }
      params.set(key, value);
    }
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PostPagination({ page, totalPages, basePath, searchParams }: PostPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      aria-label="Paginação do blog"
      className="mt-12 flex items-center justify-between gap-4 border-t border-omnia-deep-blue/10 pt-6"
    >
      {prev ? (
        <Link
          href={buildHref(basePath, prev, searchParams)}
          className="text-sm font-medium text-omnia-deep-blue hover:text-omnia-emerald"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="text-sm text-omnia-graphite-light/60">← Anterior</span>
      )}

      <span className="text-sm text-omnia-graphite-light">
        Página {page} de {totalPages}
      </span>

      {next ? (
        <Link
          href={buildHref(basePath, next, searchParams)}
          className="text-sm font-medium text-omnia-deep-blue hover:text-omnia-emerald"
        >
          Próxima →
        </Link>
      ) : (
        <span className="text-sm text-omnia-graphite-light/60">Próxima →</span>
      )}
    </nav>
  );
}
