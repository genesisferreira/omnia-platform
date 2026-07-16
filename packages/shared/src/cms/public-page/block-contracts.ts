/**
 * Contratos estruturais dos blocos (camada CMS → Payload).
 */

import type {
  CompaniesBlockLayout,
  FeaturesBlockColumns,
  FeaturesIconKey,
  HeroBlockVariant,
  ValuesIconKey,
} from './constants';

export type HeroBlockContract = {
  blockType: 'hero';
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  primaryAction?: { label: string; href: string } | null;
  secondaryAction?: { label: string; href: string } | null;
  variant?: HeroBlockVariant;
};

export type InstitutionalIntroBlockContract = {
  blockType: 'institutionalIntro';
  eyebrow?: string | null;
  title: string;
  body: string;
  highlights?: string[];
};

export type MissionVisionBlockContract = {
  blockType: 'missionVision';
  missionTitle: string;
  missionBody: string;
  visionTitle: string;
  visionBody: string;
  visionYear?: string | null;
};

export type ValuesBlockContract = {
  blockType: 'values';
  title?: string | null;
  subtitle?: string | null;
  items: Array<{
    title: string;
    description?: string | null;
    iconKey?: ValuesIconKey | null;
  }>;
};

export type FeaturesBlockContract = {
  blockType: 'features';
  title?: string | null;
  subtitle?: string | null;
  items: Array<{
    title: string;
    description: string;
    iconKey?: FeaturesIconKey | null;
  }>;
  columns?: FeaturesBlockColumns;
};

export type CompaniesBlockContract = {
  blockType: 'companies';
  title?: string | null;
  subtitle?: string | null;
  limit?: number;
  showRole?: boolean;
  showDescription?: boolean;
  layout?: CompaniesBlockLayout;
};

export type PageBlockContract =
  | HeroBlockContract
  | InstitutionalIntroBlockContract
  | MissionVisionBlockContract
  | ValuesBlockContract
  | FeaturesBlockContract
  | CompaniesBlockContract;
