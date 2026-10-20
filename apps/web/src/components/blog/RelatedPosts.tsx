import type { PublicPostListItemDto } from '@omnia/shared';
import { SectionTitle } from '@omnia/ui';

import { PostCard } from './PostCard';

type RelatedPostsProps = {
  posts: PublicPostListItemDto[];
};

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-omnia-deep-blue/10 pt-12">
      <SectionTitle title="Posts relacionados" subtitle="Continue explorando o Blog da Omnia." />
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {posts.slice(0, 4).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
