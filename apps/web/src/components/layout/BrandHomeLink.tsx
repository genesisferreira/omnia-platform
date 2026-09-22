import Link from 'next/link';

/**
 * Marca textual da Holding.
 * Logo gráfica oficial será adicionada em feature isolada quando o master estiver disponível.
 */
export function BrandHomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-10 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Omnia Frigo Holding — início"
    >
      <span className="font-heading text-base font-semibold tracking-tight text-omnia-deep-blue sm:text-lg">
        Omnia Frigo Holding
      </span>
    </Link>
  );
}
