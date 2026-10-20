import type { PublicPostListItemDto } from '@omnia/shared';

import { PostCard } from './PostCard';

type PostListProps = {
  posts: PublicPostListItemDto[];
  emptyMessage?: string;
};

export function PostList({
  posts,
  emptyMessage = 'Nenhum post publicado no momento.',
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <p className="border border-dashed border-omnia-deep-blue/20 bg-omnia-graphite/[0.03] px-6 py-10 text-center text-omnia-graphite-light">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
