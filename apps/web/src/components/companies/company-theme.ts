import type { PublicCompanyBrandTheme } from '@omnia/shared';

export type CompanyThemeTokens = {
  shell: string;
  hero: string;
  accent: string;
  badge: string;
  panel: string;
  cta: string;
};

export const companyThemeTokens: Record<PublicCompanyBrandTheme, CompanyThemeTokens> = {
  omnia: {
    shell: 'bg-omnia-white text-omnia-graphite',
    hero: 'bg-gradient-to-br from-omnia-deep-blue via-omnia-deep-blue to-omnia-graphite text-omnia-white',
    accent: 'text-omnia-copper',
    badge: 'border-omnia-copper/40 bg-omnia-copper/10 text-omnia-copper',
    panel: 'border-omnia-deep-blue/10 bg-omnia-graphite/[0.03]',
    cta: 'bg-omnia-deep-blue text-omnia-white hover:bg-omnia-deep-blue/90',
  },
  renovacao: {
    shell: 'bg-omnia-white text-omnia-graphite',
    hero: 'bg-gradient-to-br from-omnia-deep-blue via-slate-700 to-teal-800 text-omnia-white',
    accent: 'text-teal-700',
    badge: 'border-teal-700/30 bg-teal-700/10 text-teal-800',
    panel: 'border-teal-800/10 bg-slate-50',
    cta: 'bg-teal-800 text-white hover:bg-teal-900',
  },
  fred: {
    shell: 'bg-omnia-white text-omnia-graphite',
    hero: 'bg-gradient-to-br from-omnia-deep-blue via-omnia-emerald to-omnia-copper text-omnia-white',
    accent: 'text-omnia-emerald',
    badge: 'border-omnia-emerald/30 bg-omnia-emerald/10 text-omnia-emerald',
    panel: 'border-omnia-emerald/15 bg-omnia-emerald/[0.04]',
    cta: 'bg-omnia-emerald text-omnia-white hover:bg-omnia-emerald/90',
  },
  cte: {
    shell: 'bg-omnia-white text-omnia-graphite',
    hero: 'bg-gradient-to-br from-omnia-graphite via-slate-800 to-omnia-deep-blue text-omnia-white',
    accent: 'text-omnia-deep-blue',
    badge: 'border-omnia-deep-blue/25 bg-omnia-deep-blue/5 text-omnia-deep-blue',
    panel: 'border-omnia-graphite/15 bg-omnia-graphite/[0.04]',
    cta: 'bg-omnia-graphite text-omnia-white hover:bg-omnia-graphite/90',
  },
  neurofrigo: {
    shell: 'bg-slate-950 text-slate-100',
    hero: 'bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-cyan-50',
    accent: 'text-cyan-300',
    badge: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    panel: 'border-cyan-400/15 bg-slate-900/80',
    cta: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  },
};
