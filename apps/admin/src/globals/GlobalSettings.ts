import type { GlobalConfig } from 'payload';

export const GlobalSettings: GlobalConfig = {
  slug: 'global-settings',
  label: 'Configurações Globais',
  admin: {
    group: 'Sistema',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'Omnia Platform',
      label: 'Nome do site',
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      defaultValue: 'Ecossistema digital da Omnia Frigo Holding',
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'E-mail de contato',
    },
    {
      name: 'heroTitle',
      type: 'text',
      label: 'Título do Hero (Portal)',
      defaultValue: 'Ecossistema Omnia Frigo Holding',
    },
    {
      name: 'heroSubtitle',
      type: 'textarea',
      label: 'Subtítulo do Hero (Portal)',
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'Texto do CTA',
      defaultValue: 'Conheça o ecossistema',
    },
    {
      name: 'ctaUrl',
      type: 'text',
      label: 'URL do CTA',
      defaultValue: '#ecossistema',
    },
  ],
};
