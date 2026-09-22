import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PostBreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function PostBreadcrumb({ items }: PostBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-omnia-graphite-light">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-omnia-deep-blue">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-omnia-deep-blue' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
