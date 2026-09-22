import type { PublicPageBlockDto } from '@omnia/shared';

import { CompaniesBlockView } from '@/components/home/CompanyCards';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { Hero } from '@/components/home/Hero';
import { InstitutionalIntroSection } from '@/components/home/InstitutionalIntroSection';
import { MissionVisionSection } from '@/components/home/MissionVisionSection';
import { ValuesSection } from '@/components/home/ValuesSection';

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
          case 'institutionalIntro':
            return <InstitutionalIntroSection key={`intro-${index}`} block={block} />;
          case 'missionVision':
            return <MissionVisionSection key={`mission-${index}`} block={block} />;
          case 'values':
            return <ValuesSection key={`values-${index}`} block={block} />;
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
