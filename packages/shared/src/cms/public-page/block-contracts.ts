/**
 * Contratos estruturais dos blocos MVP (camada CMS → Payload fields futuros).
 * Intencionalmente sem dependência de `payload` — Admin implementará `Block` em F4C.
 */

import type {
  CompaniesBlockLayout,
  FeaturesBlockColumns,
  FeaturesIconKey,
  HeroBlockVariant,
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

export type PageBlockContract = HeroBlockContract | FeaturesBlockContract | CompaniesBlockContract;
