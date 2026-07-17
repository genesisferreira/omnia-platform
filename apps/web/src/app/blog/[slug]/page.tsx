import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@omnia/ui';

import { extractHeadings, LexicalContent } from '@/components/blog/LexicalContent';
import { PostBreadcrumb } from '@/components/blog/PostBreadcrumb';
import { PostShare } from '@/components/blog/PostShare';
import { ReadingTime } from '@/components/blog/ReadingTime';
import { RelatedPosts } from '@/components/blog/RelatedPosts';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPost } from '@/lib/cms-blog';
import {
  buildArticleJsonLd,
  buildNotFoundMetadata,
  buildPageMetadata,
  resolveCanonicalUrl,
  SEO_FALLBACK_DESCRIPTION,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

async function loadPost(slug: string) {
  const siteContext = await getSiteContext();
  const siteSlug = siteContext.resolution.ok
    ? siteContext.resolution.context.site.slug
    : 'omnia-hub';
  const post = await fetchPublicPost(siteSlug, slug);
  return { post, hostname: siteContext.hostname };
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    return buildNotFoundMetadata();
  }

  const { post, hostname } = await loadPost(slug);
  if (!post) {
    return buildNotFoundMetadata();
  }

  return buildPageMetadata({
    pathname: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt ?? SEO_FALLBACK_DESCRIPTION,
    seo: {
      metaTitle: post.seo.metaTitle,
      metaDescription: post.seo.metaDescription,
      canonicalUrl: post.seo.canonicalUrl,
      noIndex: post.seo.noIndex,
    },
    hostname,
  });
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    notFound();
  }

  const { post, hostname } = await loadPost(slug);
  if (!post) {
    notFound();
  }

  const pathname = `/blog/${post.slug}`;
  const shareUrl =
    resolveCanonicalUrl({
      pathname,
      editorialCanonical: post.seo.canonicalUrl,
      hostname,
    }) ?? pathname;
  const headings = extractHeadings(post.content);
  const publishedLabel = post.publishedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(post.publishedAt))
    : null;

  const imageUrl = post.seo.openGraphImage?.url ?? post.featuredImage?.url ?? null;

  return (
    <>
      <JsonLd
        data={buildArticleJsonLd({
          pathname,
          headline: post.seo.metaTitle ?? post.title,
          description: post.seo.metaDescription ?? post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          authorName: post.author?.name,
          imageUrl,
          hostname,
          schemaType: post.seo.schemaType,
        })}
      />
      <article className="py-12 md:py-16">
        <Container size="narrow">
          <PostBreadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: post.title },
            ]}
          />

          <header className="mb-10 space-y-4">
            <div className="flex flex-wrap gap-3 text-sm text-omnia-graphite-light">
              {post.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/blog/categoria/${category.slug}`}
                  className="font-medium uppercase tracking-wide text-omnia-emerald hover:text-omnia-deep-blue"
                >
                  {category.name}
                </Link>
              ))}
              {publishedLabel && post.publishedAt ? (
                <time dateTime={post.publishedAt}>{publishedLabel}</time>
              ) : null}
              <ReadingTime minutes={post.readingTimeMinutes} />
            </div>

            <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue md:text-5xl">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="text-lg text-omnia-graphite-light">{post.excerpt}</p>
            ) : null}

            {post.author ? (
              <p className="text-sm text-omnia-graphite">Por {post.author.name}</p>
            ) : null}

            <PostShare title={post.title} url={shareUrl} />
          </header>

          <div className="mb-10 lg:hidden">
            <TableOfContents headings={headings} />
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
            <LexicalContent nodes={post.content} />
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          </div>

          {post.tags.length > 0 ? (
            <ul className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.id}>
                  <Link
                    href={`/blog/tag/${tag.slug}`}
                    className="inline-flex rounded-md border border-omnia-copper/30 px-3 py-1 text-sm text-omnia-copper hover:bg-omnia-copper/10"
                  >
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <RelatedPosts posts={post.relatedPosts} />
        </Container>
      </article>
    </>
  );
}
