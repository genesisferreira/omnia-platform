import {
  isPlainRecord,
  readOptionalTrimmedString,
  readRequiredTrimmedString,
  sanitizePublicCanonicalUrl,
  sanitizePublicHref,
} from '../public-page/sanitize';
import {
  PUBLIC_POST_MAX_CONTENT_NODES,
  PUBLIC_POST_MAX_RELATED,
  PUBLIC_POST_TYPES,
  type PublicPostType,
} from './constants';
import type {
  PublicPostAuthorDto,
  PublicPostCategoryDto,
  PublicPostDto,
  PublicPostListDto,
  PublicPostListItemDto,
  PublicPostMediaDto,
  PublicPostSeoDto,
  PublicPostSiteRefDto,
  PublicPostTagDto,
  PublicRichTextChild,
  PublicRichTextNode,
} from './types';

const isPublicPostType = (value: unknown): value is PublicPostType =>
  typeof value === 'string' && (PUBLIC_POST_TYPES as readonly string[]).includes(value);

const readId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return readRequiredTrimmedString(value);
};

const readIsoDate = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const time = Date.parse(trimmed);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
  }
  return null;
};

const estimateReadingTimeMinutes = (nodes: PublicRichTextNode[]): number => {
  const collect = (children: PublicRichTextChild[]): string =>
    children
      .map((child) => {
        if (child.type === 'text') {
          return child.text;
        }
        return collect(child.children);
      })
      .join(' ');

  const text = nodes
    .map((node) => {
      if (node.type === 'list') {
        return node.items.map((item) => collect(item)).join(' ');
      }
      return collect(node.children);
    })
    .join(' ');

  const words = text
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0).length;

  return Math.max(1, Math.ceil(words / 200));
};

const mapMedia = (value: unknown): PublicPostMediaDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const url =
    sanitizePublicHref(value.url) ??
    sanitizePublicHref(value.filename ? `/media/${String(value.filename)}` : null);
  if (!url || (!url.startsWith('/') && !url.startsWith('http'))) {
    const rawUrl = readOptionalTrimmedString(value.url);
    if (!rawUrl) {
      return null;
    }
    return {
      url: rawUrl,
      alt: readOptionalTrimmedString(value.alt),
    };
  }

  return {
    url,
    alt: readOptionalTrimmedString(value.alt),
  };
};

const mapSite = (value: unknown): PublicPostSiteRefDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }
  const id = readId(value.id);
  const slug = readRequiredTrimmedString(value.slug);
  if (!id || !slug) {
    return null;
  }
  return { id, slug };
};

const mapAuthor = (value: unknown): PublicPostAuthorDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }
  const id = readId(value.id);
  const name = readRequiredTrimmedString(value.name);
  const slug = readRequiredTrimmedString(value.slug);
  if (!id || !name || !slug) {
    return null;
  }

  const social = isPlainRecord(value.social) ? value.social : {};

  return {
    id,
    name,
    slug,
    bio: readOptionalTrimmedString(value.bio),
    avatar: mapMedia(value.avatar),
    social: {
      linkedin: sanitizePublicHref(social.linkedin),
      twitter: sanitizePublicHref(social.twitter),
      instagram: sanitizePublicHref(social.instagram),
    },
  };
};

const mapCategory = (value: unknown): PublicPostCategoryDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }
  const id = readId(value.id);
  const name = readRequiredTrimmedString(value.name);
  const slug = readRequiredTrimmedString(value.slug);
  if (!id || !name || !slug) {
    return null;
  }
  return {
    id,
    name,
    slug,
    description: readOptionalTrimmedString(value.description),
  };
};

const mapTag = (value: unknown): PublicPostTagDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }
  const id = readId(value.id);
  const name = readRequiredTrimmedString(value.name);
  const slug = readRequiredTrimmedString(value.slug);
  if (!id || !name || !slug) {
    return null;
  }
  return { id, name, slug };
};

const mapTextMarks = (
  format: unknown,
): { bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean } | undefined => {
  const marks: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    code?: boolean;
  } = {};

  if (typeof format === 'number') {
    if (format & 1) marks.bold = true;
    if (format & 2) marks.italic = true;
    if (format & 8) marks.underline = true;
    if (format & 16) marks.code = true;
  } else if (isPlainRecord(format)) {
    if (format.bold === true) marks.bold = true;
    if (format.italic === true) marks.italic = true;
    if (format.underline === true) marks.underline = true;
    if (format.code === true) marks.code = true;
  }

  return Object.keys(marks).length > 0 ? marks : undefined;
};

const mapRichTextChildren = (value: unknown, depth = 0): PublicRichTextChild[] => {
  if (!Array.isArray(value) || depth > 8) {
    return [];
  }

  const children: PublicRichTextChild[] = [];
  for (const entry of value) {
    if (!isPlainRecord(entry)) {
      continue;
    }

    if (entry.type === 'text' || typeof entry.text === 'string') {
      const text = typeof entry.text === 'string' ? entry.text : '';
      if (text === '') {
        continue;
      }
      children.push({
        type: 'text',
        text,
        format: mapTextMarks(entry.format),
      });
      continue;
    }

    if (entry.type === 'link' || entry.type === 'autolink') {
      const href =
        sanitizePublicHref(
          isPlainRecord(entry.fields) ? entry.fields.url : (entry.url ?? entry.href),
        ) ?? '#';
      children.push({
        type: 'link',
        href,
        children: mapRichTextChildren(entry.children, depth + 1),
      });
    }
  }

  return children;
};

const mapHeadingTag = (value: unknown): 'h2' | 'h3' | 'h4' | null => {
  if (value === 'h2' || value === 'h3' || value === 'h4') {
    return value;
  }
  if (value === 2) return 'h2';
  if (value === 3) return 'h3';
  if (value === 4) return 'h4';
  return null;
};

export const mapPublicRichText = (value: unknown): PublicRichTextNode[] => {
  const root = isPlainRecord(value) && isPlainRecord(value.root) ? value.root : value;
  if (!isPlainRecord(root) || !Array.isArray(root.children)) {
    return [];
  }

  const nodes: PublicRichTextNode[] = [];
  for (const entry of root.children) {
    if (nodes.length >= PUBLIC_POST_MAX_CONTENT_NODES) {
      break;
    }
    if (!isPlainRecord(entry)) {
      continue;
    }

    if (entry.type === 'paragraph') {
      nodes.push({
        type: 'paragraph',
        children: mapRichTextChildren(entry.children),
      });
      continue;
    }

    if (entry.type === 'heading') {
      const tag = mapHeadingTag(entry.tag);
      if (!tag) {
        continue;
      }
      nodes.push({
        type: 'heading',
        tag,
        children: mapRichTextChildren(entry.children),
      });
      continue;
    }

    if (entry.type === 'quote') {
      nodes.push({
        type: 'quote',
        children: mapRichTextChildren(entry.children),
      });
      continue;
    }

    if (entry.type === 'list') {
      const listType = entry.listType === 'number' ? 'number' : 'bullet';
      const items: PublicRichTextChild[][] = [];
      if (Array.isArray(entry.children)) {
        for (const item of entry.children) {
          if (!isPlainRecord(item)) {
            continue;
          }
          items.push(mapRichTextChildren(item.children));
        }
      }
      nodes.push({ type: 'list', listType, items });
    }
  }

  return nodes;
};

const mapSeo = (value: unknown): PublicPostSeoDto => {
  const seo = isPlainRecord(value) ? value : {};
  return {
    metaTitle: readOptionalTrimmedString(seo.metaTitle),
    metaDescription: readOptionalTrimmedString(seo.metaDescription),
    canonicalUrl: sanitizePublicCanonicalUrl(seo.canonicalUrl),
    noIndex: seo.noIndex === true,
    noFollow: seo.noFollow === true,
    openGraphTitle: readOptionalTrimmedString(seo.openGraphTitle),
    openGraphDescription: readOptionalTrimmedString(seo.openGraphDescription),
    openGraphImage: mapMedia(seo.openGraphImage),
    schemaType: readOptionalTrimmedString(seo.schemaType),
  };
};

export const mapPublicPostListItem = (value: unknown): PublicPostListItemDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const id = readId(value.id);
  const site = mapSite(value.site);
  const title = readRequiredTrimmedString(value.title);
  const slug = readRequiredTrimmedString(value.slug);
  const type = isPublicPostType(value.type) ? value.type : null;

  if (!id || !site || !title || !slug || !type) {
    return null;
  }

  const content = mapPublicRichText(value.content);
  const author = mapAuthor(value.author);
  const categories = Array.isArray(value.categories)
    ? value.categories
        .map(mapCategory)
        .filter((item): item is PublicPostCategoryDto => item !== null)
        .map(({ id: categoryId, name, slug: categorySlug }) => ({
          id: categoryId,
          name,
          slug: categorySlug,
        }))
    : [];
  const tags = Array.isArray(value.tags)
    ? value.tags
        .map(mapTag)
        .filter((item): item is PublicPostTagDto => item !== null)
        .map(({ id: tagId, name, slug: tagSlug }) => ({ id: tagId, name, slug: tagSlug }))
    : [];

  return {
    id,
    site,
    title,
    slug,
    excerpt: readOptionalTrimmedString(value.excerpt),
    type,
    publishedAt: readIsoDate(value.publishedAt),
    readingTimeMinutes: estimateReadingTimeMinutes(content),
    featuredImage: mapMedia(value.featuredImage),
    author: author
      ? {
          id: author.id,
          name: author.name,
          slug: author.slug,
        }
      : null,
    categories,
    tags,
  };
};

export const mapPublicPost = (value: unknown): PublicPostDto | null => {
  const listItem = mapPublicPostListItem(value);
  if (!listItem || !isPlainRecord(value)) {
    return null;
  }

  const content = mapPublicRichText(value.content);
  const relatedSource = Array.isArray(value.relatedPosts) ? value.relatedPosts : [];
  const relatedPosts: PublicPostListItemDto[] = [];

  for (const related of relatedSource) {
    if (relatedPosts.length >= PUBLIC_POST_MAX_RELATED) {
      break;
    }
    const mapped = mapPublicPostListItem(related);
    if (!mapped || mapped.id === listItem.id) {
      continue;
    }
    relatedPosts.push(mapped);
  }

  return {
    ...listItem,
    readingTimeMinutes: estimateReadingTimeMinutes(content),
    content,
    seo: mapSeo(value.seo),
    relatedPosts,
    updatedAt: readIsoDate(value.updatedAt),
  };
};

export const mapPublicPostList = (args: {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
}): PublicPostListDto | null => {
  const items: PublicPostListItemDto[] = [];
  for (const item of args.items) {
    const mapped = mapPublicPostListItem(item);
    if (!mapped) {
      return null;
    }
    items.push(mapped);
  }

  const page = Number.isInteger(args.page) && args.page > 0 ? args.page : 1;
  const pageSize =
    Number.isInteger(args.pageSize) && args.pageSize > 0 ? args.pageSize : items.length || 1;
  const total = Number.isInteger(args.total) && args.total >= 0 ? args.total : items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, page, pageSize, total, totalPages };
};

export const mapPublicPostCategory = mapCategory;
export const mapPublicPostTag = mapTag;
export const mapPublicPostAuthor = mapAuthor;
