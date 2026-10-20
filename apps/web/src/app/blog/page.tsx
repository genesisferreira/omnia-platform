import type { Metadata } from 'next';
import Link from 'next/link';

import { Container, SectionTitle } from '@omnia/ui';

import { PostBreadcrumb } from '@/components/blog/PostBreadcrumb';
import { PostList } from '@/components/blog/PostList';
import { PostPagination } from '@/components/blog/PostPagination';
import { PostSearch } from '@/components/blog/PostSearch';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPostCategories, fetchPublicPosts, fetchPublicPostTags } from '@/lib/cms-blog';
import { buildPageMetadata, buildWebPageJsonLd, SEO_FALLBACK_DESCRIPTION } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type BlogPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

async function resolveSiteSlug(): Promise<{ siteSlug: string; hostname: string | null }> {
  const siteContext = await getSiteContext();
  const siteSlug = siteContext.resolution.ok
    ? siteContext.resolution.context.site.slug
    : 'omnia-hub';
  return { siteSlug, hostname: siteContext.hostname };
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const { hostname } = await resolveSiteSlug();
  const params = await searchParams;
  const q = params.q?.trim();

  return buildPageMetadata({
    pathname: '/blog',
    title: q ? `Busca: ${q} | Blog` : 'Blog | Omnia Frigo Holding',
    description: 'Artigos e novidades do ecossistema Omnia Frigo Holding.',
    hostname,
  });
}

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const { siteSlug, hostname } = await resolveSiteSlug();
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const [list, categories, tags] = await Promise.all([
    fetchPublicPosts({ siteSlug, page, q: q || undefined }),
    fetchPublicPostCategories(siteSlug),
    fetchPublicPostTags(siteSlug),
  ]);

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          pathname: '/blog',
          title: 'Blog | Omnia Frigo Holding',
          description: 'Artigos e novidades do ecossistema Omnia Frigo Holding.',
          hostname,
        })}
      />
      <section className="border-b border-omnia-deep-blue/10 bg-gradient-to-b from-omnia-deep-blue/[0.04] to-transparent py-14 md:py-20">
        <Container>
          <PostBreadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Blog' }]} />
          <SectionTitle
            title="Blog"
            subtitle="Tradição, educação e inteligência artificial em refrigeração."
          />
          <div className="mt-8 max-w-2xl">
            <PostSearch defaultValue={q} />
          </div>
          {(categories.length > 0 || tags.length > 0) && (
            <div className="mt-8 flex flex-wrap gap-4 text-sm">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/blog/categoria/${category.slug}`}
                  className="text-omnia-emerald hover:text-omnia-deep-blue"
                >
                  {category.name}
                </Link>
              ))}
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="text-omnia-copper hover:text-omnia-deep-blue"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container>
          <PostList
            posts={list.items}
            emptyMessage={q ? `Nenhum resultado para “${q}”.` : 'Nenhum post publicado no momento.'}
          />
          <PostPagination
            page={list.page}
            totalPages={list.totalPages}
            basePath="/blog"
            searchParams={{ q: q || undefined }}
          />
          <p className="mt-8 text-sm text-omnia-graphite-light">
            <Link href="/blog/rss.xml" className="hover:text-omnia-deep-blue">
              Feed RSS
            </Link>
          </p>
          <p className="sr-only">{SEO_FALLBACK_DESCRIPTION}</p>
        </Container>
      </section>
    </>
  );
}
