import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type InstitutionalNavLinkProps = {
  href: string;
  className?: string;
  onClick?: ComponentPropsWithoutRef<'a'>['onClick'];
  children: ReactNode;
};

/** Hash routes usam <a> nativo para scroll confiável no App Router. */
export function InstitutionalNavLink({
  href,
  className,
  onClick,
  children,
}: InstitutionalNavLinkProps) {
  if (href.includes('#')) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
