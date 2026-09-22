import type { PublicPostType } from './constants';

export type PublicPostSiteRefDto = {
  id: string;
  slug: string;
};

export type PublicPostMediaDto = {
  url: string;
  alt: string | null;
};

export type PublicPostAuthorDto = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar: PublicPostMediaDto | null;
  social: {
    linkedin: string | null;
    twitter: string | null;
    instagram: string | null;
  };
};

export type PublicPostCategoryDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type PublicPostTagDto = {
  id: string;
  name: string;
  slug: string;
};

export type PublicPostSeoDto = {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  openGraphTitle: string | null;
  openGraphDescription: string | null;
  openGraphImage: PublicPostMediaDto | null;
  schemaType: string | null;
};

export type PublicRichTextTextMark = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

export type PublicRichTextChild =
  | {
      type: 'text';
      text: string;
      format?: PublicRichTextTextMark;
    }
  | {
      type: 'link';
      href: string;
      children: PublicRichTextChild[];
    };

export type PublicRichTextNode =
  | {
      type: 'paragraph';
      children: PublicRichTextChild[];
    }
  | {
      type: 'heading';
      tag: 'h2' | 'h3' | 'h4';
      children: PublicRichTextChild[];
    }
  | {
      type: 'list';
      listType: 'bullet' | 'number';
      items: PublicRichTextChild[][];
    }
  | {
      type: 'quote';
      children: PublicRichTextChild[];
    };

export type PublicPostListItemDto = {
  id: string;
  site: PublicPostSiteRefDto;
  title: string;
  slug: string;
  excerpt: string | null;
  type: PublicPostType;
  publishedAt: string | null;
  readingTimeMinutes: number;
  featuredImage: PublicPostMediaDto | null;
  author: Pick<PublicPostAuthorDto, 'id' | 'name' | 'slug'> | null;
  categories: Pick<PublicPostCategoryDto, 'id' | 'name' | 'slug'>[];
  tags: Pick<PublicPostTagDto, 'id' | 'name' | 'slug'>[];
};

export type PublicPostDto = PublicPostListItemDto & {
  content: PublicRichTextNode[];
  seo: PublicPostSeoDto;
  relatedPosts: PublicPostListItemDto[];
  updatedAt: string | null;
};

export type PublicPostListDto = {
  items: PublicPostListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
