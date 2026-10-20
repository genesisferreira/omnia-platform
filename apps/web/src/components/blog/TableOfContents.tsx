'use client';

type TocHeading = {
  id: string;
  text: string;
  tag: 'h2' | 'h3' | 'h4';
};

type TableOfContentsProps = {
  headings: TocHeading[];
};

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Índice do artigo"
      className="rounded-md border border-omnia-deep-blue/10 bg-omnia-graphite/[0.03] p-4"
    >
      <p className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-omnia-deep-blue">
        Neste artigo
      </p>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={
              heading.tag === 'h2'
                ? 'text-sm'
                : heading.tag === 'h3'
                  ? 'pl-3 text-sm'
                  : 'pl-5 text-sm'
            }
          >
            <a
              href={`#${heading.id}`}
              className="text-omnia-graphite-light transition-colors hover:text-omnia-emerald"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
