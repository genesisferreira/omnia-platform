import type { PublicPageBlockDto } from '@omnia/shared';

import { CompaniesBlockView } from '@/components/home/CompanyCards';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { Hero } from '@/components/home/Hero';

type BlockRendererProps = {
  blocks: PublicPageBlockDto[];
};

/**
 * Registry exaustivo — sem renderização arbitrária por nome do CMS.
 */
export async function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case 'hero':
            return <Hero key={`hero-${index}`} block={block} />;
          case 'features':
            return <FeaturesSection key={`features-${index}`} block={block} />;
          case 'companies':
            return <CompaniesBlockView key={`companies-${index}`} block={block} />;
          default: {
            const _exhaustive: never = block;
            return _exhaustive;
          }
        }
      })}
    </>
  );
}
