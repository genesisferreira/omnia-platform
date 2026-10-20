import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container, SectionTitle } from '@omnia/ui';

import { PostBreadcrumb } from '@/components/blog/PostBreadcrumb';
import { PostList } from '@/components/blog/PostList';
import { PostPagination } from '@/components/blog/PostPagination';
import { PostSearch } from '@/components/blog/PostSearch';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPosts, fetchPublicPostTags } from '@/lib/cms-blog';
import { buildNotFoundMetadata, buildPageMetadata, buildWebPageJsonLd } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type TagPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

async function resolveContext() {
  const siteContext = await getSiteContext();
  const siteSlug = siteContext.resolution.ok
    ? siteContext.resolution.context.site.slug
    : 'omnia-hub';
  return { siteSlug, hostname: siteContext.hostname };
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  const { siteSlug, hostname } = await resolveContext();
  const tags = await fetchPublicPostTags(siteSlug);
  const tag = tags.find((item) => item.slug === slug);

  if (!tag) {
    return buildNotFoundMetadata();
  }

  return buildPageMetadata({
    pathname: `/blog/tag/${tag.slug}`,
    title: `#${tag.name} | Blog`,
    description: `Posts com a tag ${tag.name}.`,
    hostname,
  });
}

export default async function BlogTagPage({ params, searchParams }: TagPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    notFound();
  }

  const { siteSlug, hostname } = await resolveContext();
  const query = await searchParams;
  const q = query.q?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);

  const tags = await fetchPublicPostTags(siteSlug);
  const tag = tags.find((item) => item.slug === slug);
  if (!tag) {
    notFound();
  }

  const list = await fetchPublicPosts({
    siteSlug,
    page,
    tag: tag.slug,
    q: q || undefined,
  });

  const pathname = `/blog/tag/${tag.slug}`;

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          pathname,
          title: `#${tag.name} | Blog`,
          description: `Posts com a tag ${tag.name}.`,
          hostname,
        })}
      />
      <section className="border-b border-omnia-deep-blue/10 py-14 md:py-20">
        <Container>
          <PostBreadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: `#${tag.name}` },
            ]}
          />
          <SectionTitle title={`#${tag.name}`} subtitle="Posts com esta tag." />
          <div className="mt-8 max-w-2xl">
            <PostSearch basePath={pathname} defaultValue={q} />
          </div>
        </Container>
      </section>
      <section className="py-12 md:py-16">
        <Container>
          <PostList posts={list.items} emptyMessage="Nenhum post com esta tag." />
          <PostPagination
            page={list.page}
            totalPages={list.totalPages}
            basePath={pathname}
            searchParams={{ q: q || undefined }}
          />
        </Container>
      </section>
    </>
  );
}
