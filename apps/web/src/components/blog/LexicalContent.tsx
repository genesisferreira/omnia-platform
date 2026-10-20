import type { ReactNode } from 'react';

import type { PublicRichTextChild, PublicRichTextNode } from '@omnia/shared';

function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function renderChildren(children: PublicRichTextChild[], keyPrefix: string): ReactNode[] {
  return children.map((child, index) => {
    const key = `${keyPrefix}-${index}`;
    if (child.type === 'link') {
      return (
        <a
          key={key}
          href={child.href}
          className="text-omnia-emerald underline-offset-2 hover:underline"
          rel={child.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          target={child.href.startsWith('http') ? '_blank' : undefined}
        >
          {renderChildren(child.children, key)}
        </a>
      );
    }

    let node: ReactNode = child.text;
    if (child.format?.code) {
      node = (
        <code className="rounded bg-omnia-graphite/10 px-1 py-0.5 font-mono text-[0.9em]">
          {node}
        </code>
      );
    }
    if (child.format?.bold) {
      node = <strong>{node}</strong>;
    }
    if (child.format?.italic) {
      node = <em>{node}</em>;
    }
    if (child.format?.underline) {
      node = <span className="underline">{node}</span>;
    }
    return <span key={key}>{node}</span>;
  });
}

function collectText(children: PublicRichTextChild[]): string {
  return children
    .map((child) => {
      if (child.type === 'text') {
        return child.text;
      }
      return collectText(child.children);
    })
    .join('');
}

export function extractHeadings(
  nodes: PublicRichTextNode[],
): Array<{ id: string; text: string; tag: 'h2' | 'h3' | 'h4' }> {
  const headings: Array<{ id: string; text: string; tag: 'h2' | 'h3' | 'h4' }> = [];
  const seen = new Map<string, number>();

  for (const node of nodes) {
    if (node.type !== 'heading') {
      continue;
    }
    const text = collectText(node.children).trim();
    if (!text) {
      continue;
    }
    const base = slugifyHeading(text) || 'secao';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    headings.push({ id, text, tag: node.tag });
  }

  return headings;
}

type LexicalContentProps = {
  nodes: PublicRichTextNode[];
  className?: string;
};

export function LexicalContent({ nodes, className }: LexicalContentProps) {
  const headings = extractHeadings(nodes);
  let headingIndex = 0;

  return (
    <div className={className ?? 'space-y-5 text-omnia-graphite'}>
      {nodes.map((node, index) => {
        if (node.type === 'paragraph') {
          return (
            <p key={`p-${index}`} className="leading-relaxed text-omnia-graphite-light">
              {renderChildren(node.children, `p-${index}`)}
            </p>
          );
        }

        if (node.type === 'heading') {
          const heading = headings[headingIndex];
          headingIndex += 1;
          const id = heading?.id;
          const shared = 'scroll-mt-24 font-heading font-bold tracking-tight text-omnia-deep-blue';
          const children = renderChildren(node.children, `h-${index}`);

          if (node.tag === 'h2') {
            return (
              <h2 key={`h-${index}`} id={id} className={`${shared} text-2xl md:text-3xl`}>
                {children}
              </h2>
            );
          }
          if (node.tag === 'h3') {
            return (
              <h3 key={`h-${index}`} id={id} className={`${shared} text-xl md:text-2xl`}>
                {children}
              </h3>
            );
          }
          return (
            <h4 key={`h-${index}`} id={id} className={`${shared} text-lg md:text-xl`}>
              {children}
            </h4>
          );
        }

        if (node.type === 'quote') {
          return (
            <blockquote
              key={`q-${index}`}
              className="border-l-4 border-omnia-copper/60 bg-omnia-copper/5 py-3 pl-4 italic text-omnia-graphite"
            >
              {renderChildren(node.children, `q-${index}`)}
            </blockquote>
          );
        }

        if (node.type === 'list') {
          const ListTag = node.listType === 'number' ? 'ol' : 'ul';
          return (
            <ListTag
              key={`l-${index}`}
              className={
                node.listType === 'number'
                  ? 'list-decimal space-y-2 pl-5 text-omnia-graphite-light'
                  : 'list-disc space-y-2 pl-5 text-omnia-graphite-light'
              }
            >
              {node.items.map((item, itemIndex) => (
                <li key={`li-${index}-${itemIndex}`}>
                  {renderChildren(item, `li-${index}-${itemIndex}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        return null;
      })}
    </div>
  );
}
