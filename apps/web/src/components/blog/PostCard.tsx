import Link from 'next/link';

import type { PublicPostListItemDto } from '@omnia/shared';

import { ReadingTime } from './ReadingTime';

function formatPublishedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

type PostCardProps = {
  post: PublicPostListItemDto;
};

export function PostCard({ post }: PostCardProps) {
  const publishedLabel = formatPublishedAt(post.publishedAt);
  const category = post.categories[0];

  return (
    <article className="group flex h-full flex-col border-b border-omnia-deep-blue/10 pb-8 pt-2">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-omnia-graphite-light">
        {category ? (
          <Link
            href={`/blog/categoria/${category.slug}`}
            className="font-medium uppercase tracking-wide text-omnia-emerald hover:text-omnia-deep-blue"
          >
            {category.name}
          </Link>
        ) : null}
        {publishedLabel ? (
          <time dateTime={post.publishedAt ?? undefined}>{publishedLabel}</time>
        ) : null}
        <ReadingTime minutes={post.readingTimeMinutes} />
      </div>

      <h2 className="font-heading text-2xl font-bold tracking-tight text-omnia-deep-blue">
        <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-omnia-emerald">
          {post.title}
        </Link>
      </h2>

      {post.excerpt ? (
        <p className="mt-3 line-clamp-3 flex-1 text-omnia-graphite-light">{post.excerpt}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        {post.author ? (
          <span className="text-sm text-omnia-graphite">{post.author.name}</span>
        ) : (
          <span />
        )}
        <Link
          href={`/blog/${post.slug}`}
          className="text-sm font-medium text-omnia-copper transition-colors hover:text-omnia-deep-blue"
        >
          Ler artigo
        </Link>
      </div>
    </article>
  );
}
