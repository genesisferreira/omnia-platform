'use client';

import { useCallback, useState } from 'react';

import { Button } from '@omnia/ui';

type PostShareProps = {
  title: string;
  url: string;
};

export function PostShare({ title, url }: PostShareProps) {
  const [copied, setCopied] = useState(false);

  const shareLinkedIn = useCallback(() => {
    const target = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
  }, [url]);

  const shareX = useCallback(() => {
    const target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
  }, [title, url]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-omnia-deep-blue">Compartilhar</span>
      <Button type="button" size="sm" variant="outline" onClick={shareLinkedIn}>
        LinkedIn
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={shareX}>
        X
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={copyLink}>
        {copied ? 'Copiado' : 'Copiar link'}
      </Button>
    </div>
  );
}
